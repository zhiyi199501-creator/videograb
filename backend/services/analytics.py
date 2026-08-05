"""访问与登录事件埋点。"""

from __future__ import annotations

import hashlib
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from db import get_db

_PATH_RE = re.compile(r"^/[A-Za-z0-9\-._~!$&'()*+,;=:@/%]*$")
_VISITOR_RE = re.compile(r"^[A-Za-z0-9\-_]{8,64}$")


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def hash_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    salt = os.environ.get("JWT_SECRET", "dev-salt")
    return hashlib.sha256(f"{salt}:{ip}".encode("utf-8")).hexdigest()[:32]


def normalize_path(path: str) -> str | None:
    raw = (path or "").strip()
    if not raw:
        return None
    # Drop query/hash; keep pathname only
    path_only = raw.split("?", 1)[0].split("#", 1)[0]
    if not path_only.startswith("/"):
        path_only = "/" + path_only
    if len(path_only) > 512:
        return None
    if not _PATH_RE.match(path_only):
        return None
    return path_only


def record_pageview(
    *,
    path: str,
    visitor_id: str,
    locale: str | None = None,
    user_id: str | None = None,
    ip: str | None = None,
) -> bool:
    clean = normalize_path(path)
    if not clean:
        return False
    vid = (visitor_id or "").strip()
    if not _VISITOR_RE.match(vid):
        return False
    loc = (locale or "").strip().lower()[:16] or None
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO pageviews (
                id, path, locale, visitor_id, user_id, ip_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                clean,
                loc,
                vid,
                user_id,
                hash_ip(ip),
                _now_iso(),
            ),
        )
    return True


def record_auth_event(
    *,
    event: str,
    email: str,
    user_id: str | None = None,
    ip: str | None = None,
) -> None:
    if event not in ("login", "register", "login_failed"):
        return
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO auth_events (
                id, user_id, email, event, ip_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                user_id,
                email.strip().lower()[:254],
                event,
                hash_ip(ip),
                _now_iso(),
            ),
        )


def list_auth_events(
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, user_id, email, event, created_at
            FROM auth_events
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    return [dict(r) for r in rows]


def count_auth_events() -> int:
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) AS c FROM auth_events").fetchone()
    return int(row["c"]) if row else 0
