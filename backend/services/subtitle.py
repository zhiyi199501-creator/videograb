"""字幕提取：B 站专用接口优先，其他平台走 yt-dlp VTT。"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Optional
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import yt_dlp

from services.ytdlp import _USER_AGENT, _base_opts, _normalize_url

logger = logging.getLogger(__name__)

MAX_SUBTITLE_CHARS = 15000

_BV_RE = re.compile(r"(?:BV|bv)([a-zA-Z0-9]+)")
_AV_RE = re.compile(r"(?:av|AV)(\d+)")


class SubtitleError(Exception):
    """无法提取字幕时抛出，附带用户可读中文信息。"""


def _http_get_json(url: str, referer: str = "https://www.bilibili.com/") -> Any:
    headers = {
        "User-Agent": _USER_AGENT,
        "Referer": referer,
        "Origin": "https://www.bilibili.com",
        "Accept": "application/json, text/plain, */*",
    }
    req = Request(url, headers=headers)
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_get_text(url: str, referer: str = "") -> str:
    if url.startswith("//"):
        url = "https:" + url
    headers = {"User-Agent": _USER_AGENT, "Accept": "*/*"}
    if referer:
        headers["Referer"] = referer
    req = Request(url, headers=headers)
    with urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _parse_bilibili_id(url: str) -> tuple[Optional[str], Optional[int]]:
    """返回 (bvid, aid)。"""
    m = _BV_RE.search(url)
    if m:
        return "BV" + m.group(1), None
    m = _AV_RE.search(url)
    if m:
        return None, int(m.group(1))
    return None, None


def _is_bilibili(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return "bilibili.com" in host or "b23.tv" in host


def _format_ts(seconds: float) -> str:
    s = max(0, int(seconds))
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    if h:
        return f"{h:02d}:{m:02d}:{sec:02d}"
    return f"{m:02d}:{sec:02d}"


def _segments_to_text(segments: list[dict]) -> str:
    lines = []
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        start = seg.get("start", 0)
        lines.append(f"[{_format_ts(float(start))}] {text}")
    text = "\n".join(lines)
    if len(text) > MAX_SUBTITLE_CHARS:
        text = text[:MAX_SUBTITLE_CHARS] + "\n…（字幕已截断）"
    return text


def _parse_bilibili_json_subtitle(raw: str) -> list[dict]:
    data = json.loads(raw)
    body = data.get("body") or []
    segments = []
    for item in body:
        content = (item.get("content") or "").strip()
        if not content:
            continue
        segments.append(
            {
                "start": float(item.get("from") or 0),
                "end": float(item.get("to") or 0),
                "text": content,
            }
        )
    return segments


def _pick_bilibili_subtitle_url(subtitles: list[dict]) -> Optional[str]:
    if not subtitles:
        return None
    preferred = ("zh-CN", "zh-Hans", "ai-zh", "zh", "zh-Hant", "en")
    by_lan = {str(s.get("lan") or ""): s for s in subtitles}
    for lan in preferred:
        item = by_lan.get(lan)
        if item and item.get("subtitle_url"):
            return item["subtitle_url"]
    for s in subtitles:
        if s.get("subtitle_url"):
            return s["subtitle_url"]
    return None


def _extract_urls_from_dm_view(raw: bytes) -> list[str]:
    """从 dm/view 响应中提取 aisubtitle URL（JSON 解析失败时的兜底）。"""
    found = re.findall(
        rb"(?:https?:)?//aisubtitle\.hdslb\.com/[a-zA-Z0-9_./?=&\-%]+",
        raw,
    )
    urls: list[str] = []
    for item in found:
        s = item.decode("utf-8", errors="ignore").rstrip('",')
        if s.startswith("//"):
            s = "https:" + s
        elif s.startswith("http://"):
            s = "https://" + s[len("http://") :]
        if s not in urls:
            urls.append(s)
    return urls


def _fetch_dm_view_subtitles(aid: int, cid: int, retries: int = 4) -> list[dict]:
    """拉取 B 站 dm/view 字幕列表，遇 -429 限流时退避重试。"""
    dm_url = f"https://api.bilibili.com/x/v2/dm/view?type=1&oid={cid}&pid={aid}"
    headers = {
        "User-Agent": _USER_AGENT,
        "Referer": "https://www.bilibili.com/",
        "Origin": "https://www.bilibili.com",
        "Accept": "application/json, */*",
    }
    last_err: Optional[Exception] = None
    for attempt in range(retries):
        try:
            req = Request(dm_url, headers=headers)
            with urlopen(req, timeout=30) as resp:
                raw = resp.read()
            # 现代接口返回 JSON；偶发仍可能是 protobuf，用正则兜底
            try:
                payload = json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                urls = _extract_urls_from_dm_view(raw)
                if urls:
                    return [{"lan": "zh", "subtitle_url": u} for u in urls]
                last_err = SubtitleError("dm/view 返回无法解析")
                time.sleep(0.8 * (attempt + 1))
                continue

            code = payload.get("code")
            if code == -429:
                last_err = SubtitleError("B 站接口限流，请稍后重试")
                time.sleep(1.2 * (attempt + 1))
                continue
            if code != 0:
                last_err = SubtitleError(
                    f"获取 B 站字幕失败: {payload.get('message') or code}"
                )
                time.sleep(0.5 * (attempt + 1))
                continue

            sub_block = (payload.get("data") or {}).get("subtitle") or {}
            subs = sub_block.get("subtitles") or []
            if subs:
                return subs
            # JSON 成功但无列表时，再尝试从原文抠 URL
            urls = _extract_urls_from_dm_view(raw)
            if urls:
                return [{"lan": "zh", "subtitle_url": u} for u in urls]
            return []
        except Exception as e:
            last_err = e
            time.sleep(0.8 * (attempt + 1))
    if last_err:
        raise SubtitleError(str(last_err)) from last_err
    return []


def extract_bilibili_subtitles(url: str) -> list[dict]:
    bvid, aid = _parse_bilibili_id(url)
    if not bvid and not aid:
        raise SubtitleError("无法解析 B 站视频 ID")

    if bvid:
        view_url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
    else:
        view_url = f"https://api.bilibili.com/x/web-interface/view?aid={aid}"

    view = _http_get_json(view_url)
    if view.get("code") != 0:
        raise SubtitleError(f"获取 B 站视频信息失败: {view.get('message') or view.get('code')}")

    data = view.get("data") or {}
    aid = data.get("aid") or aid
    pages = data.get("pages") or []
    cid = pages[0].get("cid") if pages else data.get("cid")
    if not aid or not cid:
        raise SubtitleError("无法获取 B 站 cid，可能是无效视频")

    subtitles: list[dict] = []

    # 1) dm/view（最可靠，含 CC / AI 字幕；带限流重试）
    try:
        subtitles = _fetch_dm_view_subtitles(int(aid), int(cid))
    except SubtitleError:
        raise
    except Exception:
        logger.debug("dm/view subtitle lookup failed", exc_info=True)

    # 2) player/v2
    if not subtitles:
        player_url = f"https://api.bilibili.com/x/player/v2?aid={aid}&cid={cid}"
        try:
            player = _http_get_json(player_url)
            if player.get("code") == 0:
                sub_block = (player.get("data") or {}).get("subtitle") or {}
                subtitles = sub_block.get("subtitles") or []
        except Exception:
            logger.debug("player/v2 subtitle lookup failed", exc_info=True)

    # 3) view.subtitle.list
    if not subtitles:
        subtitles = (data.get("subtitle") or {}).get("list") or []

    sub_url = _pick_bilibili_subtitle_url(subtitles)
    if not sub_url:
        raise SubtitleError("该 B 站视频没有可用字幕（未上传且无 AI 字幕）")

    raw_text = _http_get_text(sub_url, referer="https://www.bilibili.com/")
    try:
        segments = _parse_bilibili_json_subtitle(raw_text)
    except json.JSONDecodeError as e:
        raise SubtitleError("B 站字幕格式无法解析") from e
    if not segments:
        raise SubtitleError("B 站字幕文件为空")
    return segments


_VTT_TS_RE = re.compile(
    r"(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})"
)


def _vtt_time_to_seconds(h: Optional[str], m: str, s: str, ms: str) -> float:
    hours = int(h or 0)
    return hours * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def parse_vtt(content: str) -> list[dict]:
    segments: list[dict] = []
    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = _VTT_TS_RE.match(line)
        if not m:
            i += 1
            continue
        start = _vtt_time_to_seconds(m.group(1), m.group(2), m.group(3), m.group(4))
        end = _vtt_time_to_seconds(m.group(5), m.group(6), m.group(7), m.group(8))
        i += 1
        texts: list[str] = []
        while i < len(lines) and lines[i].strip():
            t = re.sub(r"<[^>]+>", "", lines[i]).strip()
            if t and not t.isdigit():
                texts.append(t)
            i += 1
        if texts:
            segments.append({"start": start, "end": end, "text": " ".join(texts)})
    return segments


_LANG_PRIORITY = (
    "zh-Hans",
    "zh-CN",
    "zh",
    "zh-Hant",
    "zh-TW",
    "en",
    "en-US",
    "en-GB",
)


def _pick_ytdlp_track(tracks: dict) -> Optional[tuple[str, list]]:
    if not tracks:
        return None
    for lang in _LANG_PRIORITY:
        if lang in tracks and tracks[lang]:
            return lang, tracks[lang]
    # 模糊匹配中文
    for lang, items in tracks.items():
        if lang.lower().startswith("zh") and items:
            return lang, items
    for lang, items in tracks.items():
        if items:
            return lang, items
    return None


def _pick_vtt_url(formats: list) -> Optional[str]:
    # 优先 vtt / srv3 / json3
    for ext in ("vtt", "srv3", "json3", "ttml", "srv1", "srv2"):
        for f in formats:
            if f.get("ext") == ext and f.get("url"):
                return f["url"]
    for f in formats:
        if f.get("url"):
            return f["url"]
    return None


def extract_ytdlp_subtitles(url: str) -> list[dict]:
    opts = {
        **_base_opts(url),
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["zh-Hans", "zh-CN", "zh", "zh-Hant", "en"],
        "subtitlesformat": "vtt/best",
    }

    def _extract() -> dict:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False)

    info = _extract()
    manual = info.get("subtitles") or {}
    auto = info.get("automatic_captions") or {}
    # 忽略弹幕等非字幕轨道
    for tracks in (manual, auto):
        for key in list(tracks.keys()):
            if key.lower() in ("danmaku", "comments"):
                tracks.pop(key, None)

    picked = _pick_ytdlp_track(manual) or _pick_ytdlp_track(auto)
    if not picked:
        raise SubtitleError("该视频没有可用字幕（平台未提供字幕轨道）")

    lang, formats = picked
    sub_url = _pick_vtt_url(formats)
    if not sub_url:
        raise SubtitleError(f"找到字幕语言 {lang}，但无法获取下载地址")

    raw = _http_get_text(sub_url, referer=url)
    # YouTube json3
    ext = (formats[0].get("ext") if formats else "") or ""
    if ext == "json3" or "json3" in sub_url:
        try:
            data = json.loads(raw)
            segments = []
            for ev in data.get("events") or []:
                segs = ev.get("segs") or []
                text = "".join(s.get("utf8") or "" for s in segs).strip()
                if not text or text == "\n":
                    continue
                start_ms = ev.get("tStartMs") or 0
                dur_ms = ev.get("dDurationMs") or 0
                segments.append(
                    {
                        "start": start_ms / 1000.0,
                        "end": (start_ms + dur_ms) / 1000.0,
                        "text": text.replace("\n", " "),
                    }
                )
            if segments:
                return segments
        except json.JSONDecodeError:
            pass

    segments = parse_vtt(raw)
    if not segments:
        raise SubtitleError("字幕解析结果为空")
    return segments


def extract_subtitles(url: str, *, allow_asr: bool = True) -> dict:
    """提取字幕，返回 {segments, text, source}。

    优先平台字幕 / yt-dlp；都没有且 allow_asr=True 时，回退到语音转写。
    """
    url = _normalize_url(url.strip())
    if not url.startswith(("http://", "https://")):
        raise SubtitleError("无效的视频链接")

    last_err: Optional[Exception] = None

    if _is_bilibili(url):
        try:
            segments = extract_bilibili_subtitles(url)
            text = _segments_to_text(segments)
            return {"segments": segments, "text": text, "source": "bilibili"}
        except SubtitleError as e:
            last_err = e
            logger.info("Bilibili subtitle failed, fallback to yt-dlp: %s", e)
        except Exception as e:
            last_err = e
            logger.warning("Bilibili subtitle error, fallback to yt-dlp", exc_info=True)

    try:
        segments = extract_ytdlp_subtitles(url)
        text = _segments_to_text(segments)
        return {"segments": segments, "text": text, "source": "yt-dlp"}
    except SubtitleError as e:
        last_err = e
        logger.info("yt-dlp subtitle unavailable: %s", e)
    except Exception as e:
        last_err = e
        logger.exception("yt-dlp subtitle extraction failed")

    if allow_asr:
        try:
            from services.asr import transcribe_url

            logger.info("No captions found, falling back to ASR for %s", url)
            return transcribe_url(url)
        except SubtitleError:
            raise
        except Exception as e:
            logger.exception("ASR fallback failed")
            raise SubtitleError(
                f"该视频无字幕，语音转写也失败了: {e}"
            ) from e

    if last_err:
        raise SubtitleError(str(last_err))
    raise SubtitleError("该视频没有可用字幕（平台未提供字幕轨道）")
