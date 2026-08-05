"""公开埋点：页面访问。"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from routers.api import limiter
from services import analytics as analytics_store
from services.auth import get_optional_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class PageviewBody(BaseModel):
    path: str = Field(..., min_length=1, max_length=512)
    visitor_id: str = Field(..., min_length=8, max_length=64)
    locale: Optional[str] = Field(None, max_length=16)


@router.post("/pageview")
@limiter.limit("120/minute")
async def record_pageview(
    request: Request,
    body: PageviewBody,
    user=Depends(get_optional_user),
):
    ok = analytics_store.record_pageview(
        path=body.path,
        visitor_id=body.visitor_id,
        locale=body.locale,
        user_id=user["id"] if user else None,
        ip=request.client.host if request.client else None,
    )
    return {"ok": ok}
