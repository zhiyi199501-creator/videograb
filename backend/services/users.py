"""用户与订阅数据访问。"""

from __future__ import annotations

import sqlite3
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from db import get_db


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def create_user(email: str, password_hash: str) -> dict[str, Any]:
    user_id = str(uuid.uuid4())
    created_at = _now_iso()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (user_id, email, password_hash, created_at),
        )
    return {
        "id": user_id,
        "email": email,
        "stripe_customer_id": None,
        "created_at": created_at,
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def set_stripe_customer_id(user_id: str, customer_id: str) -> None:
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
            (customer_id, user_id),
        )


def get_user_by_stripe_customer(customer_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE stripe_customer_id = ?",
            (customer_id,),
        ).fetchone()
    return dict(row) if row else None


def get_subscription(user_id: str) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM subscriptions WHERE user_id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def upsert_subscription(
    user_id: str,
    *,
    plan: str = "pro",
    status: str,
    stripe_subscription_id: str | None = None,
    stripe_price_id: str | None = None,
    current_period_end: int | None = None,
) -> None:
    updated_at = _now_iso()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO subscriptions (
                user_id, plan, status, stripe_subscription_id,
                stripe_price_id, current_period_end, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                plan = excluded.plan,
                status = excluded.status,
                stripe_subscription_id = COALESCE(
                    excluded.stripe_subscription_id,
                    subscriptions.stripe_subscription_id
                ),
                stripe_price_id = COALESCE(
                    excluded.stripe_price_id,
                    subscriptions.stripe_price_id
                ),
                current_period_end = COALESCE(
                    excluded.current_period_end,
                    subscriptions.current_period_end
                ),
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                plan,
                status,
                stripe_subscription_id,
                stripe_price_id,
                current_period_end,
                updated_at,
            ),
        )


def is_pro_user(user_id: str) -> bool:
    sub = get_subscription(user_id)
    if not sub:
        return False
    if sub.get("plan") != "pro":
        return False
    status = sub.get("status")
    if status not in ("active", "past_due"):
        return False
    period_end = sub.get("current_period_end")
    if period_end is not None and int(period_end) + 86400 < int(time.time()):
        return False
    return True


def try_record_event(event_id: str, event_type: str) -> bool:
    """记录 Stripe event；若已存在返回 False（表示重复，应跳过）。"""
    with get_db() as conn:
        try:
            conn.execute(
                "INSERT INTO stripe_events (event_id, type, processed_at) VALUES (?, ?, ?)",
                (event_id, event_type, _now_iso()),
            )
            return True
        except sqlite3.IntegrityError:
            return False


def try_record_checkout_session(session_id: str, user_id: str) -> bool:
    with get_db() as conn:
        try:
            conn.execute(
                "INSERT INTO checkout_sessions (session_id, user_id, created_at) VALUES (?, ?, ?)",
                (session_id, user_id, _now_iso()),
            )
            return True
        except sqlite3.IntegrityError:
            return False
