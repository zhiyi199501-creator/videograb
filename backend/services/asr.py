"""无字幕时：下载音频并用 faster-whisper 转写。"""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

import yt_dlp

from services.subtitle import MAX_SUBTITLE_CHARS, SubtitleError, _format_ts
from services.ytdlp import TEMP_DIR, _base_opts, _normalize_url

logger = logging.getLogger(__name__)

# 仅当显式设置 HF_ENDPOINT 时才走镜像。海外机（如新加坡）默认官方 huggingface.co，
# 强制 hf-mirror 会导致 308/HEAD 失败、模型下不全。
# 国内网络可在 .env 设：HF_ENDPOINT=https://hf-mirror.com

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "tiny").strip() or "tiny"
# 单次 ASR 最长秒数；超过则只转写前 N 分钟（可通过环境变量调大）
ASR_MAX_DURATION = int(os.environ.get("ASR_MAX_DURATION", "1800"))
# 语音语种：空 / auto = 自动检测；可设 en / zh 等强制指定
_ASR_LANGUAGE_RAW = os.environ.get("ASR_LANGUAGE", "").strip().lower()
ASR_LANGUAGE: Optional[str] = (
    None
    if not _ASR_LANGUAGE_RAW or _ASR_LANGUAGE_RAW in ("auto", "detect")
    else _ASR_LANGUAGE_RAW
)

_model = None


def _get_model():
    global _model
    if _model is not None:
        return _model
    try:
        from faster_whisper import WhisperModel
    except ImportError as e:
        raise SubtitleError(
            "未安装语音转写组件。请执行: pip install faster-whisper"
        ) from e

    logger.info(
        "Loading Whisper model %s (HF_ENDPOINT=%s)",
        WHISPER_MODEL,
        os.environ.get("HF_ENDPOINT") or "https://huggingface.co",
    )
    try:
        _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    except Exception as e:
        # 镜像失败时回退官方源再试一次
        endpoint = (os.environ.get("HF_ENDPOINT") or "").strip()
        if endpoint and "huggingface.co" not in endpoint:
            logger.warning(
                "Whisper download via %s failed (%s); retrying official Hub",
                endpoint,
                e,
            )
            os.environ.pop("HF_ENDPOINT", None)
            try:
                _model = WhisperModel(
                    WHISPER_MODEL, device="cpu", compute_type="int8"
                )
            except Exception as e2:
                raise SubtitleError(
                    "语音模型下载失败，请检查服务器能否访问 huggingface.co "
                    f"（或配置可用的 HF_ENDPOINT）。详情: {e2}"
                ) from e2
        else:
            raise SubtitleError(
                "语音模型下载失败，请检查服务器网络或 HF 缓存。"
                f"详情: {e}"
            ) from e
    return _model


def _transcribe_kwargs() -> dict:
    """构建 whisper.transcribe 参数：默认自动语种，避免英文视频被强行按中文识别。"""
    kwargs: dict = {"vad_filter": True}
    if ASR_LANGUAGE:
        kwargs["language"] = ASR_LANGUAGE
        if ASR_LANGUAGE in ("zh", "zh-cn", "zh-hans", "chinese"):
            kwargs["initial_prompt"] = "以下是普通话的简体中文字幕。"
    # language=None → faster-whisper 自动检测（英/中等）
    return kwargs


def _probe_duration(url: str) -> float:
    opts = {
        **_base_opts(url),
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False) or {}
    return float(info.get("duration") or 0)


def _download_audio(url: str, out_dir: Path) -> tuple[Path, bool, float]:
    """下载音频。超长时只截取前 ASR_MAX_DURATION 秒。

    Returns: (audio_path, truncated, full_duration_seconds)
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    duration = _probe_duration(url)
    truncated = bool(duration and duration > ASR_MAX_DURATION)
    if truncated:
        logger.info(
            "ASR truncate: duration=%.0fs > limit=%ss, only first %s min",
            duration,
            ASR_MAX_DURATION,
            ASR_MAX_DURATION // 60,
        )

    outtmpl = str(out_dir / "asr.%(ext)s")
    opts: dict = {
        **_base_opts(url),
        "format": "bestaudio/best",
        "outtmpl": outtmpl,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "64",
            }
        ],
    }
    if truncated:
        end = float(ASR_MAX_DURATION)

        def _ranges(_info, _ydl):
            return [{"start_time": 0.0, "end_time": end}]

        opts["download_ranges"] = _ranges
        opts["force_keyframes_at_cuts"] = True

    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.extract_info(url, download=True)

    mp3 = out_dir / "asr.mp3"
    if mp3.exists():
        return mp3, truncated, duration
    files = list(out_dir.glob("asr.*"))
    if not files:
        raise SubtitleError("音频提取失败，无法语音转写")
    return files[0], truncated, duration


def transcribe_url(url: str, work_dir: Optional[str] = None) -> dict:
    """下载音频并转写，返回 {segments, text, source}。"""
    url = _normalize_url(url.strip())
    parent = Path(work_dir) if work_dir else Path(TEMP_DIR) / "asr"
    parent.mkdir(parents=True, exist_ok=True)

    truncated = False
    duration = 0.0

    with tempfile.TemporaryDirectory(prefix="asr_", dir=str(parent)) as tmp:
        tmp_path = Path(tmp)
        audio_path, truncated, duration = _download_audio(url, tmp_path)
        model = _get_model()
        tx_opts = _transcribe_kwargs()
        logger.info(
            "ASR transcribe language=%s",
            tx_opts.get("language") or "auto",
        )
        segments_iter, info = model.transcribe(str(audio_path), **tx_opts)
        detected = getattr(info, "language", None) or tx_opts.get("language")
        if detected:
            logger.info("ASR detected language=%s", detected)
        segments: list[dict] = []
        lines: list[str] = []
        for seg in segments_iter:
            text = (seg.text or "").strip()
            if not text:
                continue
            item = {
                "start": float(seg.start or 0),
                "end": float(seg.end or 0),
                "text": text,
            }
            segments.append(item)
            lines.append(f"[{_format_ts(item['start'])}] {text}")

    if not segments:
        raise SubtitleError("语音转写结果为空，无法总结该视频")

    if truncated:
        note = (
            f"…（视频约 {int(duration // 60)} 分钟，已仅转写前 "
            f"{ASR_MAX_DURATION // 60} 分钟；如需全文可在服务端调大 ASR_MAX_DURATION）"
        )
        lines.append(note)

    text = "\n".join(lines)
    if len(text) > MAX_SUBTITLE_CHARS:
        text = text[:MAX_SUBTITLE_CHARS] + "\n…（转写已截断）"

    return {"segments": segments, "text": text, "source": "asr"}
