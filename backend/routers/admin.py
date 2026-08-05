"""管理后台 API（需 ADMIN_EMAILS 白名单）。"""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from services import admin_stats
from services import analytics as analytics_store
from services import users as user_store
from services.auth import get_admin_user, user_public

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ProActionBody(BaseModel):
    action: Literal["grant", "revoke"]


@router.get("/overview")
def admin_overview(_admin=Depends(get_admin_user)):
    return admin_stats.overview()


@router.get("/visits")
def admin_visits(
    days: int = Query(7, ge=1, le=90),
    _admin=Depends(get_admin_user),
):
    return admin_stats.visits(days=days)


@router.get("/logins")
def admin_logins(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _admin=Depends(get_admin_user),
):
    items = analytics_store.list_auth_events(limit=limit, offset=offset)
    return {
        "total": analytics_store.count_auth_events(),
        "items": items,
        "limit": limit,
        "offset": offset,
    }


@router.get("/users")
def admin_users(
    q: Optional[str] = Query(None, max_length=254),
    pro: Optional[int] = Query(None, ge=0, le=1),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _admin=Depends(get_admin_user),
):
    pro_filter: Optional[bool] = None if pro is None else bool(pro)
    return admin_stats.list_users(
        q=q,
        pro_filter=pro_filter,
        limit=limit,
        offset=offset,
    )


@router.post("/users/{user_id}/pro")
def admin_pro_action(
    user_id: str,
    body: ProActionBody,
    _admin=Depends(get_admin_user),
):
    user = user_store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.action == "grant":
        admin_stats.grant_pro(user_id)
    else:
        admin_stats.revoke_pro(user_id)
    updated = user_store.get_user_by_id(user_id)
    return {"user": user_public(updated)}


@router.get("/system")
def admin_system(_admin=Depends(get_admin_user)):
    return admin_stats.system_metrics()
