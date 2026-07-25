import asyncio
import logging
import os
import re
import shutil
import threading
import time
import uuid
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable, Optional

import yt_dlp

from models.job import FormatInfo, JobStatus

logger = logging.getLogger(__name__)

TEMP_DIR = os.environ.get("TEMP_DIR", "/tmp/videos")
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT", "3"))
JOB_TTL_HOURS = int(os.environ.get("JOB_TTL_HOURS", "2"))
# 单次下载的整体时间预算（秒）。被目标站点限速/卡住的任务会在超时后主动失败，
# 避免任务无限期停留在"下载中"。可通过环境变量调大以支持超大文件。
DOWNLOAD_TIMEOUT = int(os.environ.get("DOWNLOAD_TIMEOUT", "600"))


class DownloadTimeout(Exception):
    """下载超过整体时间预算时抛出，用于主动中止卡住/被限速的任务。"""


_download_semaphore = asyncio.Semaphore(MAX_CONCURRENT)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# 可选：为需要登录/风控的平台（B站、YouTube 会员视频等）提供 cookie。
#   COOKIES_FILE: Netscape 格式 cookie 文件路径
#   COOKIES_FROM_BROWSER: 从本机浏览器读取，如 "chrome"/"edge"/"firefox"/"safari"
def _cookie_opts() -> dict:
    cookies_file = os.environ.get("COOKIES_FILE", "").strip()
    cookies_from_browser = os.environ.get("COOKIES_FROM_BROWSER", "").strip()
    if cookies_file and os.path.exists(cookies_file):
        return {"cookiefile": cookies_file}
    if cookies_from_browser:
        # 支持 "chrome" 或 "chrome:Profile 1"
        if ":" in cookies_from_browser:
            browser, profile = cookies_from_browser.split(":", 1)
            return {"cookiesfrombrowser": (browser.strip(), profile.strip())}
        return {"cookiesfrombrowser": (cookies_from_browser,)}
    return {}


def _base_opts(url: str = "") -> dict:
    """Shared yt-dlp options: retries + headers + multi player-client fallback.

    - YouTube intermittently returns "The page needs to be reloaded" on
      datacenter/unknown IPs; trying multiple player clients + retrying helps.
    - Bilibili returns HTTP 412 (Precondition Failed) without a browser
      User-Agent and a bilibili.com Referer, so we always send those headers.
    """
    headers = {"User-Agent": _USER_AGENT}
    if "bilibili.com" in url or "b23.tv" in url:
        headers["Referer"] = "https://www.bilibili.com/"
        headers["Origin"] = "https://www.bilibili.com"
    elif "douyin.com" in url or "iesdouyin.com" in url:
        headers["Referer"] = "https://www.douyin.com/"

    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 30,
        "retries": 5,
        "fragment_retries": 5,
        "extractor_retries": 3,
        "http_headers": headers,
        "extractor_args": {
            "youtube": {"player_client": ["tv", "ios", "web_safari", "web"]}
        },
    }

    opts.update(_cookie_opts())
    return opts


def _friendly_error(err: str) -> str:
    """把 yt-dlp 原始报错转成对用户友好的中文提示。"""
    low = err.lower()
    if "download exceeded" in low and "budget" in low:
        return (
            "下载超时：视频源速度过慢或被限速，已自动中止。"
            "请稍后重试、更换网络环境，或选择更低的清晰度。"
        )
    if "412" in err or "precondition failed" in low:
        return (
            "该视频被平台风控拦截（HTTP 412）。B站等平台的取流接口需要登录 "
            "Cookie，请在服务端配置 COOKIES_FROM_BROWSER 或 COOKIES_FILE 后重试。"
        )
    # YouTube 反爬：403 / SABR / 限流。当前服务器网络被目标站点拒绝提供视频数据，
    # 常见于机房/被标记 IP。换网络或配置登录 Cookie 可提升成功率。
    if (
        "403" in err
        or "forbidden" in low
        or "sabr" in low
        or "sleeping" in low
        or "the downloaded file is empty" in low
        or "eof occurred in violation" in low
    ):
        return (
            "该视频源拒绝了当前服务器的下载请求（反爬 / 地区限制）。"
            "请稍后重试、更换网络环境，或在服务端配置登录 Cookie 后再试。"
        )
    if "page needs to be reloaded" in low or "sign in to confirm" in low or "bot" in low:
        return (
            "该视频被平台反爬限制。请稍后重试，或在服务端配置浏览器 Cookie "
            "（COOKIES_FROM_BROWSER）以提升成功率。"
        )
    if "private" in low or "login" in low or "members-only" in low:
        return "该视频为私有/会员内容，需要登录 Cookie 才能下载。"
    if "requested format is not available" in low:
        return (
            "所选清晰度暂不可用（可能被平台限制）。请换一个清晰度重试，"
            "或稍后再试。"
        )
    if "unavailable" in low or "not available" in low:
        return "该视频不可用或已被删除，请检查链接。"
    if "unsupported url" in low or "no video" in low:
        return (
            "暂不支持该链接格式。抖音请尽量使用分享链接，或 "
            "https://www.douyin.com/video/视频ID 形式的地址。"
        )
    # 兜底：截断过长的原始错误
    return err.split("\n")[0][:200]


def _normalize_url(url: str) -> str:
    """把平台分享页 / 弹窗页 URL 转成 yt-dlp 可识别的标准视频页。

    抖音精选/发现等页面常见形式：
      https://www.douyin.com/jingxuan?modal_id=123
    yt-dlp 只认：
      https://www.douyin.com/video/123
    """
    url = url.strip()
    m = re.search(
        r"(?:https?://)?(?:www\.)?douyin\.com/[^?\s]*\?(?:[^#\s]*&)?modal_id=(\d+)",
        url,
        re.IGNORECASE,
    )
    if m:
        return f"https://www.douyin.com/video/{m.group(1)}"

    m = re.search(
        r"(?:https?://)?(?:www\.)?iesdouyin\.com/share/video/(\d+)",
        url,
        re.IGNORECASE,
    )
    if m:
        return f"https://www.douyin.com/video/{m.group(1)}"

    m = re.search(
        r"(https?://(?:www\.)?bilibili\.com/video/[aAbB][vV][^/?#&]+)",
        url,
        re.IGNORECASE,
    )
    if m:
        return m.group(1)

    return url


def _pick_thumbnail_url(info: dict) -> Optional[str]:
    """从 thumbnails 列表挑选最佳封面，跳过透明占位图。"""
    thumbs = info.get("thumbnails") or []
    candidates = []
    for thumb in thumbs:
        url = thumb.get("url")
        if not url or "transparent" in url.lower():
            continue
        candidates.append(thumb)
    if candidates:
        best = max(
            candidates,
            key=lambda t: (t.get("width") or 0) * (t.get("height") or 0),
        )
        return best.get("url")
    thumb = info.get("thumbnail")
    if thumb and "transparent" not in thumb.lower():
        return thumb
    return None


def _thumbnail_ext(url: str) -> str:
    lower = url.lower()
    if ".webp" in lower:
        return "webp"
    if ".png" in lower:
        return "png"
    return "jpg"


def _download_thumbnail_file(job_id: str, thumb_url: str, page_url: str) -> Optional[str]:
    """下载封面到本地，绕过平台防盗链。"""
    if thumb_url.startswith("http://"):
        thumb_url = "https://" + thumb_url[len("http://") :]
    out_dir = Path(TEMP_DIR) / job_id
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = _thumbnail_ext(thumb_url)
    out_path = out_dir / f"thumb.{ext}"

    headers = dict(_base_opts(page_url).get("http_headers", {}))
    headers.setdefault("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
    req = urllib.request.Request(thumb_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        if len(data) < 500:
            return None
        out_path.write_bytes(data)
        return str(out_path)
    except Exception:
        logger.warning("Thumbnail download failed for job %s", job_id, exc_info=True)
        return None


def _sanitize_filename(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", name)[:200]


def _is_skipped_format(fmt: dict) -> bool:
    """跳过抖音水印大文件等明显不适合下载的流。"""
    fid = (fmt.get("format_id") or "").lower()
    note = (fmt.get("format_note") or fmt.get("format") or "").lower()
    return fid.startswith("download_addr") or "watermark" in note


def _prefer_direct_format_id(format_id: str) -> str:
    """抖音等同源多 CDN：-0/-1 走 API 网关较慢，-2/-3 为直链。"""
    if re.search(r"-[01]$", format_id):
        return re.sub(r"-[01]$", "-2", format_id)
    return format_id


def _is_douyin_url(url: str) -> bool:
    return "douyin.com" in url or "iesdouyin.com" in url


def _douyin_download_opts() -> dict:
    """抖音单文件 MP4：yt-dlp 内置下载器常被 CDN 限速到 ~70KB/s。

    实测同链接用 curl 外置下载器可达数 MB/s（约 50x 提速）。
    """
    return {
        "http_chunk_size": 10 * 1024 * 1024,
        "external_downloader": "curl",
        "external_downloader_args": {
            "curl": ["-L", "--retry", "5", "--retry-delay", "1"],
        },
    }


def _format_label(fmt: dict) -> str:
    res = fmt.get("resolution") or fmt.get("format_note") or ""
    ext = fmt.get("ext", "unknown")
    if fmt.get("vcodec") == "none":
        return f"音频 {ext.upper()}"
    if res:
        return f"{res} {ext.upper()}"
    return f"最佳画质 {ext.upper()}"


def _pick_formats(info: dict) -> list[FormatInfo]:
    seen: set[str] = set()
    result: list[FormatInfo] = []

    formats = info.get("formats") or []
    video_formats = [f for f in formats if f.get("vcodec") != "none" and f.get("height")]
    audio_formats = [f for f in formats if f.get("acodec") != "none" and f.get("vcodec") == "none"]

    def _video_rank(f: dict) -> tuple:
        note = (f.get("format_note") or f.get("format") or "").lower()
        # 体积更小下载更快；同体积下优先直链 CDN，再优先更高清晰度
        api = 1 if "api" in note else 0
        filesize = f.get("filesize") or f.get("filesize_approx") or 10**15
        return (filesize, api, -(f.get("height") or 0))

    for f in sorted(video_formats, key=_video_rank):
        if _is_skipped_format(f):
            continue
        fid = f.get("format_id", "")
        height = f.get("height")
        if not fid or not height:
            continue
        key = f"{height}p"
        if key in seen:
            continue
        seen.add(key)
        result.append(
            FormatInfo(
                format_id=_prefer_direct_format_id(fid),
                ext=f.get("ext") or "mp4",
                resolution=f"{height}p",
                filesize=f.get("filesize") or f.get("filesize_approx"),
                vcodec=f.get("vcodec"),
                acodec=f.get("acodec"),
                label=_format_label(f),
            )
        )
        if len(result) >= 5:
            break

    if audio_formats:
        best_audio = max(audio_formats, key=lambda x: x.get("abr") or 0)
        result.append(
            FormatInfo(
                format_id=best_audio.get("format_id", "bestaudio"),
                ext=best_audio.get("ext") or "m4a",
                resolution=None,
                filesize=best_audio.get("filesize") or best_audio.get("filesize_approx"),
                vcodec="none",
                acodec=best_audio.get("acodec"),
                label="仅音频",
            )
        )

    if not result:
        result.append(
            FormatInfo(
                format_id="best",
                ext="mp4",
                resolution=None,
                filesize=None,
                vcodec=None,
                acodec=None,
                label="最佳画质",
            )
        )

    return result


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, dict] = {}

    def create(self, url: str) -> str:
        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {
            "job_id": job_id,
            "url": url,
            "status": JobStatus.PENDING,
            "progress": 0.0,
            "title": None,
            "thumbnail": None,
            "thumbnail_path": None,
            "duration": None,
            "uploader": None,
            "formats": [],
            "error": None,
            "filename": None,
            "file_path": None,
            "created_at": datetime.utcnow(),
        }
        return job_id

    def get(self, job_id: str) -> Optional[dict]:
        return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs) -> None:
        if job_id in self._jobs:
            self._jobs[job_id].update(kwargs)

    def delete(self, job_id: str) -> None:
        job = self._jobs.pop(job_id, None)
        job_dir = Path(TEMP_DIR) / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)
        elif job and job.get("file_path"):
            job_dir = Path(job["file_path"]).parent
            if job_dir.exists():
                shutil.rmtree(job_dir, ignore_errors=True)

    def cleanup_expired(self) -> int:
        cutoff = datetime.utcnow() - timedelta(hours=JOB_TTL_HOURS)
        expired = [
            jid
            for jid, job in self._jobs.items()
            if job["created_at"] < cutoff
        ]
        for jid in expired:
            self.delete(jid)
        return len(expired)


job_store = JobStore()


async def extract_info(job_id: str, url: str) -> None:
    url = _normalize_url(url)
    job_store.update(job_id, url=url, status=JobStatus.EXTRACTING, progress=0.0)

    def _extract() -> dict:
        opts = {**_base_opts(url), "skip_download": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False)

    try:
        info = await asyncio.to_thread(_extract)
        formats = _pick_formats(info)
        raw_duration = info.get("duration")
        duration = int(raw_duration) if raw_duration is not None else None
        thumb_url = _pick_thumbnail_url(info)
        thumb_path = None
        if thumb_url:
            thumb_path = await asyncio.to_thread(
                _download_thumbnail_file, job_id, thumb_url, url
            )
        job_store.update(
            job_id,
            status=JobStatus.READY,
            progress=1.0,
            title=info.get("title"),
            thumbnail=thumb_url,
            thumbnail_path=thumb_path,
            duration=duration,
            uploader=info.get("uploader") or info.get("channel"),
            formats=[f.model_dump() for f in formats],
        )
    except Exception as e:
        logger.exception("Extract failed for job %s", job_id)
        job_store.update(job_id, status=JobStatus.FAILED, error=_friendly_error(str(e)))


def _make_progress_hook(
    job_id: str,
    deadline: Optional[float] = None,
    expected_total: Optional[int] = None,
    multi_part: bool = False,
) -> Callable:
    """进度回调。B站/YouTube 等 DASH 会分视频、音频两次下载，需累计字节避免进度条回跳。"""
    completed_bytes = 0
    video_weight = 0.9
    last_progress = 0.05

    def hook(d: dict) -> None:
        nonlocal completed_bytes, last_progress
        if deadline is not None and time.time() > deadline:
            raise DownloadTimeout(
                f"download exceeded {DOWNLOAD_TIMEOUT}s budget"
            )

        progress = last_progress
        if d["status"] == "downloading":
            downloaded = d.get("downloaded_bytes") or 0
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if expected_total and expected_total > 0:
                progress = min((completed_bytes + downloaded) / expected_total, 0.99)
            elif multi_part and total > 0:
                part = downloaded / total
                progress = (
                    part * video_weight
                    if completed_bytes == 0
                    else video_weight + part * (0.99 - video_weight)
                )
            elif total > 0:
                progress = min(downloaded / total, 0.99)
            else:
                return

        elif d["status"] == "finished":
            chunk = d.get("total_bytes") or d.get("downloaded_bytes") or 0
            completed_bytes += chunk
            if expected_total and expected_total > 0:
                progress = min(completed_bytes / expected_total, 0.99)
            elif multi_part and chunk and completed_bytes == chunk:
                progress = video_weight
            else:
                progress = 0.99

        elif d["status"] == "postprocessing":
            progress = 0.99
        else:
            return

        if progress > last_progress:
            last_progress = progress
            job_store.update(job_id, progress=progress)

    return hook


def _needs_separate_audio(selected: Optional[dict]) -> bool:
    if not selected:
        return False
    vcodec = selected.get("vcodec")
    acodec = selected.get("acodec")
    return vcodec != "none" and (not acodec or acodec == "none")


def _expected_total_download_size(job: dict, format_id: Optional[str]) -> Optional[int]:
    """估算本次下载总字节（视频 + 需合并的音频）。"""
    if not format_id:
        return None
    fid = _prefer_direct_format_id(format_id)
    selected = next(
        (f for f in job.get("formats", []) if f.get("format_id") == fid),
        None,
    )
    if not selected:
        return None

    video_size = selected.get("filesize") or 0
    if not _needs_separate_audio(selected):
        return video_size or None

    audio_formats = [f for f in job.get("formats", []) if f.get("vcodec") == "none"]
    if not audio_formats:
        return int(video_size * 1.12) if video_size else None

    best_audio = max(
        audio_formats,
        key=lambda x: x.get("filesize") or x.get("abr") or 0,
    )
    audio_size = best_audio.get("filesize") or 0
    if video_size and audio_size:
        return video_size + audio_size
    if video_size:
        return int(video_size * 1.12)
    return None


def _expected_filesize(job: dict, format_id: Optional[str]) -> Optional[int]:
    return _expected_total_download_size(job, format_id)


def _dir_downloaded_bytes(out_dir: Path) -> int:
    total = 0
    if not out_dir.exists():
        return 0
    for path in out_dir.iterdir():
        if path.is_file():
            total += path.stat().st_size
    return total


def _monitor_download_progress(
    job_id: str,
    out_dir: Path,
    expected_size: Optional[int],
    stop_event: threading.Event,
    deadline: float,
) -> None:
    """轮询输出目录文件大小，弥补外置下载器（如 curl）不触发 progress_hooks 的问题。"""
    last_progress = 0.0
    while not stop_event.is_set():
        if time.time() > deadline:
            return

        downloaded = _dir_downloaded_bytes(out_dir)
        if expected_size and expected_size > 0 and downloaded > 0:
            progress = min(downloaded / expected_size, 0.99)
        elif downloaded > 0:
            progress = 0.5
        else:
            progress = 0.05

        if progress > last_progress:
            job_store.update(job_id, progress=progress)
            last_progress = progress

        stop_event.wait(0.15)


def _resolve_format(job: dict, format_id: Optional[str]) -> str:
    """构造 yt-dlp 格式串。

    B站/YouTube 等采用 DASH，视频与音频是分离的流。若用户选中的是纯视频
    流（acodec == none），必须 `+bestaudio` 合并音频，否则下载出的视频没声音。
    """
    if not format_id or format_id == "best":
        return "bestvideo+bestaudio/best"

    format_id = _prefer_direct_format_id(format_id)

    selected = next(
        (f for f in job.get("formats", []) if f.get("format_id") == format_id),
        None,
    )
    if selected is None:
        # 未知格式，按视频处理并兜底合并音频
        return f"{format_id}+bestaudio/{format_id}/best"

    vcodec = selected.get("vcodec")
    acodec = selected.get("acodec")

    # 纯音频：直接用
    if vcodec == "none":
        return format_id
    # 已含音频的合流格式（如 YouTube 18）：直接用
    if acodec and acodec != "none":
        return format_id
    # 纯视频流：合并最佳音频，失败则回退到原始流
    return f"{format_id}+bestaudio/{format_id}"


async def download_video(job_id: str, format_id: Optional[str] = None) -> None:
    job = job_store.get(job_id)
    if not job:
        return

    url = _normalize_url(job["url"])
    if url != job["url"]:
        job_store.update(job_id, url=url)
    out_dir = Path(TEMP_DIR) / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    job_store.update(job_id, status=JobStatus.DOWNLOADING, progress=0.05)

    fmt = _resolve_format(job, format_id)
    deadline = time.time() + DOWNLOAD_TIMEOUT
    selected = next(
        (f for f in job.get("formats", []) if f.get("format_id") == _prefer_direct_format_id(format_id or "")),
        None,
    )
    multi_part = _needs_separate_audio(selected)
    expected_total = _expected_total_download_size(job, format_id)
    stop_monitor = threading.Event()
    monitor = None
    if _is_douyin_url(url):
        monitor = threading.Thread(
            target=_monitor_download_progress,
            args=(job_id, out_dir, expected_total, stop_monitor, deadline),
            daemon=True,
        )
        monitor.start()

    def _download(fmt_selector: str) -> str:
        opts = {
            **_base_opts(url),
            "format": fmt_selector,
            "merge_output_format": "mp4",
            "outtmpl": str(out_dir / "%(title)s.%(ext)s"),
            "progress_hooks": [
                _make_progress_hook(
                    job_id, deadline, expected_total, multi_part
                )
            ],
        }
        if _is_douyin_url(url):
            opts.update(_douyin_download_opts())
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])

        files = list(out_dir.glob("*"))
        files = [f for f in files if f.is_file() and not f.name.endswith(".part")]
        if not files:
            raise RuntimeError("Download completed but no file found")
        return str(files[0])

    def _download_with_fallback() -> str:
        try:
            return _download(fmt)
        except DownloadTimeout:
            # 超时（多为被限速/卡住）不再回退重试，直接抛出以尽快反馈
            raise
        except Exception as first_err:
            # 指定格式失败（如清晰度不可用/合并流缺失），回退到通用最佳格式重试一次
            fallback = "bestvideo+bestaudio/best"
            if fmt == fallback or time.time() > deadline:
                raise
            logger.warning(
                "Format %r failed for job %s (%s); retrying with %r",
                fmt, job_id, first_err, fallback,
            )
            for leftover in out_dir.glob("*"):
                if leftover.is_file():
                    leftover.unlink(missing_ok=True)
            return _download(fallback)

    async with _download_semaphore:
        try:
            file_path = await asyncio.to_thread(_download_with_fallback)
            filename = _sanitize_filename(Path(file_path).name)
            job_store.update(
                job_id,
                status=JobStatus.COMPLETE,
                progress=1.0,
                file_path=file_path,
                filename=filename,
            )
        except Exception as e:
            logger.exception("Download failed for job %s", job_id)
            job_store.update(job_id, status=JobStatus.FAILED, error=_friendly_error(str(e)))
        finally:
            stop_monitor.set()
            if monitor is not None:
                monitor.join(timeout=1)
