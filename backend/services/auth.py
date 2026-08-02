"""密码哈希与 JWT。"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services import users as user_store

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me-use-32bytes-min!!")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "168"))
JWT_ALG = "HS256"

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"), password_hash.encode("utf-8")
        )
    except ValueError:
        return False


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已失效，请重新登录",
        ) from exc


def user_public(user: Dict[str, Any]) -> Dict[str, Any]:
    sub = user_store.get_subscription(user["id"])
    is_pro = user_store.is_pro_user(user["id"])
    free_used = user_store.get_download_free_used(user["id"])
    free_remaining = (
        None
        if is_pro
        else max(0, user_store.DOWNLOAD_FREE_LIMIT - free_used)
    )
    return {
        "id": user["id"],
        "email": user["email"],
        "is_pro": is_pro,
        "can_download": user_store.can_download(user["id"]),
        "download_free_limit": user_store.DOWNLOAD_FREE_LIMIT,
        "download_free_used": free_used,
        "download_free_remaining": free_remaining,
        "subscription": (
            {
                "plan": sub.get("plan"),
                "status": sub.get("status"),
                "current_period_end": sub.get("current_period_end"),
            }
            if sub
            else None
        ),
    }


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Dict[str, Any]:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
        )
    payload = decode_token(creds.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已失效，请重新登录",
        )
    user = user_store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
        )
    return user


async def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[Dict[str, Any]]:
    if not creds or creds.scheme.lower() != "bearer":
        return None
    try:
        return await get_current_user(creds)
    except HTTPException:
        return None
