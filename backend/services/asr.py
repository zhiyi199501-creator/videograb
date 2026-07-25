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

# 中国网络默认走 HF 镜像拉取模型
if not os.environ.get("HF_ENDPOINT"):
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "tiny").strip() or "tiny"
# 超过此时长（秒）的视频不做 ASR，避免过慢
ASR_MAX_DURATION = int(os.environ.get("ASR_MAX_DURATION", "1800"))

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

    logger.info("Loading Whisper model %s ...", WHISPER_MODEL)
    _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _model


def _download_audio(url: str, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    outtmpl = str(out_dir / "asr.%(ext)s")
    opts = {
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
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        duration = info.get("duration") or 0
        if duration and float(duration) > ASR_MAX_DURATION:
            raise SubtitleError(
                f"视频过长（约 {int(float(duration) // 60)} 分钟），"
                f"语音转写上限为 {ASR_MAX_DURATION // 60} 分钟"
            )

    mp3 = out_dir / "asr.mp3"
    if mp3.exists():
        return mp3
    files = list(out_dir.glob("asr.*"))
    if not files:
        raise SubtitleError("音频提取失败，无法语音转写")
    return files[0]


def transcribe_url(url: str, work_dir: Optional[str] = None) -> dict:
    """下载音频并转写，返回 {segments, text, source}。"""
    url = _normalize_url(url.strip())
    parent = Path(work_dir) if work_dir else Path(TEMP_DIR) / "asr"
    parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="asr_", dir=str(parent)) as tmp:
        tmp_path = Path(tmp)
        audio_path = _download_audio(url, tmp_path)
        model = _get_model()
        segments_iter, _info = model.transcribe(
            str(audio_path),
            language="zh",
            vad_filter=True,
            initial_prompt="以下是普通话的简体中文字幕。",
        )
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

    text = "\n".join(lines)
    if len(text) > MAX_SUBTITLE_CHARS:
        text = text[:MAX_SUBTITLE_CHARS] + "\n…（转写已截断）"

    return {"segments": segments, "text": text, "source": "asr"}
