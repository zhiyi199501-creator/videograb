"""视频总结编排：字幕缓存 + DeepSeek 摘要/导图/问答。"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import AsyncIterator
from typing import Any, Optional

from i18n import DEFAULT_LOCALE, t
from services import deepseek
from services.subtitle import SubtitleError, extract_subtitles
from services.ytdlp import job_store

logger = logging.getLogger(__name__)

_job_locks: dict[str, asyncio.Lock] = {}
_inflight_extract: dict[str, asyncio.Task] = {}


def _lock_for(job_id: str) -> asyncio.Lock:
    lock = _job_locks.get(job_id)
    if lock is None:
        lock = asyncio.Lock()
        _job_locks[job_id] = lock
    return lock


def _cached_subs(job: dict) -> Optional[dict[str, Any]]:
    text = job.get("subtitle_text")
    if not text:
        return None
    return {
        "segments": job.get("subtitles") or [],
        "text": text,
        "source": job.get("subtitle_source") or "cache",
    }


async def _shared_extract(job_id: str, url: str) -> dict[str, Any]:
    """同一 job 只跑一次字幕/ASR，结果写入 Job 缓存。"""
    async with _lock_for(job_id):
        job = job_store.get(job_id) or {}
        cached = _cached_subs(job)
        if cached:
            return cached

        task = _inflight_extract.get(job_id)
        if task is None or task.done():
            task = asyncio.create_task(asyncio.to_thread(extract_subtitles, url))
            _inflight_extract[job_id] = task

    try:
        result = await task
    except Exception:
        async with _lock_for(job_id):
            if _inflight_extract.get(job_id) is task:
                _inflight_extract.pop(job_id, None)
        raise

    async with _lock_for(job_id):
        job_store.update(
            job_id,
            subtitles=result["segments"],
            subtitle_text=result["text"],
            subtitle_source=result["source"],
        )
        if _inflight_extract.get(job_id) is task:
            _inflight_extract.pop(job_id, None)
    return result


async def ensure_subtitles(
    job_id: str, *, locale: str = DEFAULT_LOCALE
) -> dict[str, Any]:
    job = job_store.get(job_id)
    if not job:
        raise SubtitleError(t("job.not_found", locale))
    cached = _cached_subs(job)
    if cached:
        return cached
    url = job.get("url")
    if not url:
        raise SubtitleError(t("summarize.no_url", locale))
    return await _shared_extract(job_id, url)


async def _ensure_subtitles_with_heartbeat(
    job_id: str,
    *,
    locale: str = DEFAULT_LOCALE,
) -> AsyncIterator[dict]:
    """提取字幕期间持续推送 status/ping，避免代理/浏览器以为连接卡死。"""
    job = job_store.get(job_id)
    if not job:
        raise SubtitleError(t("job.not_found", locale))

    cached = _cached_subs(job)
    if cached:
        yield {"event": "_result", "data": cached}
        return

    url = job.get("url")
    if not url:
        raise SubtitleError(t("summarize.no_url", locale))

    yield {
        "event": "status",
        "data": {"message": t("summarize.extracting_subs", locale)},
    }

    task = asyncio.create_task(_shared_extract(job_id, url))
    started = time.time()
    while True:
        done, _ = await asyncio.wait({task}, timeout=2.0)
        if done:
            break
        elapsed = int(time.time() - started)
        yield {
            "event": "status",
            "data": {
                "message": t("summarize.asr_waiting", locale, elapsed=elapsed)
            },
        }
        yield {"event": "ping", "data": {"t": time.time()}}

    result = task.result()
    yield {"event": "_result", "data": result}


async def _await_with_heartbeat(
    coro,
    *,
    status_prefix: str,
    locale: str = DEFAULT_LOCALE,
) -> AsyncIterator[dict]:
    """在长耗时 await 期间推送 status/ping，避免 SSE 空闲被代理掐断。"""
    task = asyncio.ensure_future(coro)
    started = time.time()
    try:
        while True:
            done, _ = await asyncio.wait({task}, timeout=2.0)
            if done:
                break
            elapsed = int(time.time() - started)
            yield {
                "event": "status",
                "data": {
                    "message": t(
                        "summarize.heartbeat",
                        locale,
                        prefix=status_prefix,
                        elapsed=elapsed,
                    )
                },
            }
            yield {"event": "ping", "data": {"t": time.time()}}
        yield {"event": "_result", "data": task.result()}
    except Exception:
        if not task.done():
            task.cancel()
            try:
                await task
            except Exception:
                pass
        raise


async def summarize_events(
    job_id: str, *, locale: str = DEFAULT_LOCALE
) -> AsyncIterator[dict]:
    job = job_store.get(job_id)
    if not job:
        yield {"event": "error", "data": {"message": t("job.not_found", locale)}}
        return

    title: Optional[str] = job.get("title")

    try:
        yield {
            "event": "status",
            "data": {"message": t("summarize.start", locale)},
        }

        subs: Optional[dict] = None
        async for item in _ensure_subtitles_with_heartbeat(job_id, locale=locale):
            if item["event"] == "_result":
                subs = item["data"]
            else:
                yield item

        if not subs:
            raise SubtitleError(t("summarize.no_subtitles", locale))

        if subs.get("source") == "asr":
            yield {
                "event": "status",
                "data": {"message": t("summarize.asr_done", locale)},
            }

        segments = subs.get("segments") or []
        yield {
            "event": "subtitle",
            "data": {
                "text": subs["text"],
                "source": subs["source"],
                "segment_count": len(segments),
                "segments": segments,
            },
        }

        yield {
            "event": "status",
            "data": {"message": t("summarize.generating_summary", locale)},
        }
        summary_parts: list[str] = []
        async for token in deepseek.stream_summary(subs["text"], title=title):
            summary_parts.append(token)
            yield {"event": "content", "data": {"delta": token}}

        summary = "".join(summary_parts).strip()
        job_store.update(job_id, summary=summary)

        mindmap_prefix = t("summarize.generating_mindmap", locale)
        yield {"event": "status", "data": {"message": mindmap_prefix}}
        mindmap = ""
        async for item in _await_with_heartbeat(
            deepseek.generate_mindmap(summary or subs["text"][:3000], title=title),
            status_prefix=mindmap_prefix,
            locale=locale,
        ):
            if item["event"] == "_result":
                mindmap = item["data"] or ""
            else:
                yield item

        job_store.update(job_id, mindmap=mindmap)
        yield {"event": "mindmap", "data": {"markdown": mindmap}}

        yield {"event": "done", "data": {"ok": True}}
    except SubtitleError as e:
        yield {"event": "error", "data": {"message": str(e)}}
    except deepseek.DeepSeekError as e:
        yield {"event": "error", "data": {"message": str(e)}}
    except Exception as e:
        logger.exception("summarize failed for job %s", job_id)
        yield {
            "event": "error",
            "data": {"message": t("summarize.failed", locale, message=str(e))},
        }


async def chat_events(
    job_id: str, question: str, *, locale: str = DEFAULT_LOCALE
) -> AsyncIterator[dict]:
    job = job_store.get(job_id)
    if not job:
        yield {"event": "error", "data": {"message": t("job.not_found", locale)}}
        return

    question = (question or "").strip()
    if not question:
        yield {
            "event": "error",
            "data": {"message": t("chat.empty_question", locale)},
        }
        return

    title: Optional[str] = job.get("title")

    try:
        subs: Optional[dict] = None
        async for item in _ensure_subtitles_with_heartbeat(job_id, locale=locale):
            if item["event"] == "_result":
                subs = item["data"]
            else:
                yield item
        if not subs:
            raise SubtitleError(t("summarize.no_subtitles", locale))

        async for token in deepseek.stream_answer(
            subs["text"], question, title=title
        ):
            yield {"event": "content", "data": {"delta": token}}
        yield {"event": "done", "data": {"ok": True}}
    except SubtitleError as e:
        yield {"event": "error", "data": {"message": str(e)}}
    except deepseek.DeepSeekError as e:
        yield {"event": "error", "data": {"message": str(e)}}
    except Exception as e:
        logger.exception("chat failed for job %s", job_id)
        yield {
            "event": "error",
            "data": {"message": t("chat.failed", locale, message=str(e))},
        }
