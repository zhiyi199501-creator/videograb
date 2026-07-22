from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    EXTRACTING = "extracting"
    READY = "ready"
    DOWNLOADING = "downloading"
    COMPLETE = "complete"
    FAILED = "failed"
    EXPIRED = "expired"


class FormatInfo(BaseModel):
    format_id: str
    ext: str
    resolution: Optional[str] = None
    filesize: Optional[int] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    label: str


class ExtractRequest(BaseModel):
    url: str = Field(..., min_length=1)


class DownloadRequest(BaseModel):
    format_id: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = 0.0
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    uploader: Optional[str] = None
    formats: list[FormatInfo] = []
    error: Optional[str] = None
    filename: Optional[str] = None
