"""AI 视频总结 / 问答 SSE 路由。"""

from __future__ import annotations

import asyncio
import base64
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from models.job import JobStatus
from routers.api import limiter
from services.auth import require_ai_access, require_ai_access_and_consume
from services.summarizer import chat_events, summarize_events
from services.ytdlp import job_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

_B64_TEXT_KEYS = ("delta", "text", "markdown", "message")


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


def _sse(event: str, data: dict) -> str:
    """封装 SSE：整包 JSON 单行写出，避免换行被协议拆行吃掉。

    流式文本字段额外带 base64 副本（*_b64），前端优先解包，
    防止代理或错误解析导致 Markdown 空格、换行、* 等字符丢失。
    """
    payload = dict(data)
    for key in _B64_TEXT_KEYS:
        val = payload.get(key)
        if isinstance(val, str) and val:
            payload[f"{key}_b64"] = base64.b64encode(val.encode("utf-8")).decode(
                "ascii"
            )
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return f"event: {event}\ndata: {body}\n\n"


def _sse_padding() -> str:
    # 2KB 注释填充，促使 Next/Nginx 等代理尽快把首包刷到浏览器
    return f": {'.' * 2048}\n\n"


def _job_or_404(job_id: str) -> dict:
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs/{job_id}/summarize")
@limiter.limit("20/hour")
async def api_summarize(
    request: Request,
    job_id: str,
    _user=Depends(require_ai_access_and_consume),
):
    job = _job_or_404(job_id)
    status = job.get("status")
    if status in (JobStatus.PENDING, JobStatus.EXTRACTING):
        raise HTTPException(status_code=400, detail="视频仍在解析中，请稍后再试")
    if status == JobStatus.FAILED and not job.get("url"):
        raise HTTPException(status_code=400, detail="任务已失败，无法总结")

    async def event_stream():
        yield _sse_padding()
        async for item in summarize_events(job_id):
            yield _sse(item["event"], item["data"])
            # 让出事件循环，便于尽快刷出 chunk
            await asyncio.sleep(0)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/jobs/{job_id}/chat")
@limiter.limit("30/hour")
async def api_chat(
    request: Request,
    job_id: str,
    body: ChatRequest,
    _user=Depends(require_ai_access),
):
    _job_or_404(job_id)

    async def event_stream():
        yield _sse_padding()
        async for item in chat_events(job_id, body.question):
            yield _sse(item["event"], item["data"])
            await asyncio.sleep(0)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
