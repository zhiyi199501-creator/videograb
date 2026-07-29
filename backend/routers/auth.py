"""认证路由：注册 / 登录 / 当前用户。"""

from __future__ import annotations

import re
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from services import users as user_store
from services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    user_public,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AuthBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/register")
def register(body: AuthBody):
    email = _normalize_email(body.email)
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")
    if user_store.get_user_by_email(email):
        raise HTTPException(status_code=409, detail="该邮箱已注册")
    try:
        user = user_store.create_user(email, hash_password(body.password))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="该邮箱已注册") from exc
    token = create_access_token(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_public(user),
    }


@router.post("/login")
def login(body: AuthBody):
    email = _normalize_email(body.email)
    user = user_store.get_user_by_email(email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
        )
    token = create_access_token(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_public(user),
    }


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user_public(user)
