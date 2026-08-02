import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from models.job import DownloadRequest, ExtractRequest, FormatInfo, JobResponse, JobStatus
from services import users as user_store
from services.auth import get_current_user
from services.ytdlp import _normalize_url, download_video, extract_info, job_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

limiter = Limiter(key_func=get_remote_address)


def _to_response(job: dict) -> JobResponse:
    formats = [FormatInfo(**f) for f in job.get("formats", [])]
    return JobResponse(
        job_id=job["job_id"],
        status=job["status"],
        progress=job.get("progress", 0.0),
        title=job.get("title"),
        thumbnail=job.get("thumbnail"),
        duration=job.get("duration"),
        uploader=job.get("uploader"),
        formats=formats,
        error=job.get("error"),
        filename=job.get("filename"),
    )


@router.post("/extract", response_model=JobResponse)
@limiter.limit("60/hour")
async def api_extract(request: Request, body: ExtractRequest, background_tasks: BackgroundTasks):
    url = _normalize_url(body.url.strip())
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL")
    job_id = job_store.create(url)
    background_tasks.add_task(extract_info, job_id, url)

    job = job_store.get(job_id)
    return _to_response(job)


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def api_get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_response(job)


@router.get("/jobs/{job_id}/events")
async def api_job_events(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_stream():
        last_status = None
        last_progress = -1.0
        for _ in range(600):
            current = job_store.get(job_id)
            if not current:
                break
            status = current["status"]
            progress = current.get("progress", 0.0)
            if status != last_status or abs(progress - last_progress) > 0.01:
                payload = {
                    "status": status.value if isinstance(status, JobStatus) else status,
                    "progress": progress,
                    "error": current.get("error"),
                    "filename": current.get("filename"),
                }
                yield f"data: {json.dumps(payload)}\n\n"
                last_status = status
                last_progress = progress
            if status in (JobStatus.COMPLETE, JobStatus.FAILED, JobStatus.READY):
                if status == JobStatus.COMPLETE or status == JobStatus.FAILED:
                    break
                if status == JobStatus.READY:
                    yield f"data: {json.dumps({'status': 'ready', 'progress': 1.0})}\n\n"
                    break
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/jobs/{job_id}/download", response_model=JobResponse)
async def api_download(
    job_id: str,
    body: DownloadRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] == JobStatus.COMPLETE:
        return _to_response(job)
    if job["status"] != JobStatus.READY:
        raise HTTPException(status_code=400, detail=f"Job not ready: {job['status']}")

    if not user_store.is_pro_user(user["id"]):
        if not user_store.consume_download_free_credit(user["id"]):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"免费下载次数已用完（共 {user_store.DOWNLOAD_FREE_LIMIT} 次），"
                    "升级 Pro 可无限次下载"
                ),
            )

    job_store.update(job_id, status=JobStatus.DOWNLOADING, progress=0.05, error=None)
    background_tasks.add_task(download_video, job_id, body.format_id)
    return _to_response(job_store.get(job_id))


@router.get("/jobs/{job_id}/thumbnail")
async def api_get_thumbnail(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    thumb_path = job.get("thumbnail_path")
    if thumb_path and Path(thumb_path).exists():
        ext = Path(thumb_path).suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        return FileResponse(
            path=thumb_path,
            media_type=media_types.get(ext, "image/jpeg"),
            headers={"Cache-Control": "public, max-age=3600"},
        )

    raise HTTPException(status_code=404, detail="Thumbnail not available")


@router.get("/jobs/{job_id}/file")
async def api_get_file(
    job_id: str,
    _user=Depends(get_current_user),
):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != JobStatus.COMPLETE or not job.get("file_path"):
        raise HTTPException(status_code=400, detail="File not ready")

    file_path = Path(job["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    filename = job.get("filename") or file_path.name
    # 不手动设置 Content-Disposition：Starlette 会按 RFC 5987 对含中文等
    # 非 ASCII 的文件名做 UTF-8 百分号编码，避免 latin-1 编码报错。
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream",
    )


@router.delete("/jobs/{job_id}")
async def api_delete_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job_store.delete(job_id)
    return {"ok": True}
