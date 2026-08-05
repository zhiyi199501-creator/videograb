"""Admin 聚合统计与用户列表。"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any

from db import get_db
from services import users as user_store


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _day_start_iso(days_ago: int = 0) -> str:
    d = _now() - timedelta(days=days_ago)
    return d.replace(hour=0, minute=0, second=0).isoformat()


def _hours_ago_iso(hours: int) -> str:
    return (_now() - timedelta(hours=hours)).isoformat()


def overview() -> dict[str, Any]:
    today = _day_start_iso(0)
    week = _day_start_iso(6)
    day_ago = _hours_ago_iso(24)
    now_ts = int(time.time())

    with get_db() as conn:
        pv_today = conn.execute(
            "SELECT COUNT(*) AS c FROM pageviews WHERE created_at >= ?",
            (today,),
        ).fetchone()["c"]
        uv_today = conn.execute(
            """
            SELECT COUNT(DISTINCT visitor_id) AS c
            FROM pageviews WHERE created_at >= ?
            """,
            (today,),
        ).fetchone()["c"]
        pv_7d = conn.execute(
            "SELECT COUNT(*) AS c FROM pageviews WHERE created_at >= ?",
            (week,),
        ).fetchone()["c"]
        uv_7d = conn.execute(
            """
            SELECT COUNT(DISTINCT visitor_id) AS c
            FROM pageviews WHERE created_at >= ?
            """,
            (week,),
        ).fetchone()["c"]
        users_total = conn.execute(
            "SELECT COUNT(*) AS c FROM users"
        ).fetchone()["c"]
        # Pro: active/past_due and (no end or end+grace > now)
        pro_count = conn.execute(
            """
            SELECT COUNT(*) AS c FROM subscriptions
            WHERE plan = 'pro'
              AND status IN ('active', 'past_due')
              AND (
                current_period_end IS NULL
                OR current_period_end + 86400 >= ?
              )
            """,
            (now_ts,),
        ).fetchone()["c"]
        logins_24h = conn.execute(
            """
            SELECT COUNT(*) AS c FROM auth_events
            WHERE event IN ('login', 'register') AND created_at >= ?
            """,
            (day_ago,),
        ).fetchone()["c"]

    return {
        "pv_today": int(pv_today),
        "uv_today": int(uv_today),
        "pv_7d": int(pv_7d),
        "uv_7d": int(uv_7d),
        "users_total": int(users_total),
        "pro_count": int(pro_count),
        "logins_24h": int(logins_24h),
    }


def visits(*, days: int = 7) -> dict[str, Any]:
    days = max(1, min(days, 90))
    since = _day_start_iso(days - 1)

    with get_db() as conn:
        daily_rows = conn.execute(
            """
            SELECT substr(created_at, 1, 10) AS day,
                   COUNT(*) AS pv,
                   COUNT(DISTINCT visitor_id) AS uv
            FROM pageviews
            WHERE created_at >= ?
            GROUP BY day
            ORDER BY day ASC
            """,
            (since,),
        ).fetchall()
        top_rows = conn.execute(
            """
            SELECT path, COUNT(*) AS hits
            FROM pageviews
            WHERE created_at >= ?
            GROUP BY path
            ORDER BY hits DESC
            LIMIT 20
            """,
            (since,),
        ).fetchall()

    # Fill missing days with zeros
    by_day = {r["day"]: {"day": r["day"], "pv": int(r["pv"]), "uv": int(r["uv"])} for r in daily_rows}
    series = []
    for i in range(days - 1, -1, -1):
        day = (_now() - timedelta(days=i)).strftime("%Y-%m-%d")
        series.append(by_day.get(day, {"day": day, "pv": 0, "uv": 0}))

    return {
        "days": days,
        "daily": series,
        "top_paths": [
            {"path": r["path"], "hits": int(r["hits"])} for r in top_rows
        ],
    }


def list_users(
    *,
    q: str | None = None,
    pro_filter: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    now_ts = int(time.time())
    params: list[Any] = []
    where = ["1=1"]

    if q:
        where.append("u.email LIKE ?")
        params.append(f"%{q.strip().lower()}%")

    pro_exists_sql = """
            EXISTS (
              SELECT 1 FROM subscriptions s
              WHERE s.user_id = u.id
                AND s.plan = 'pro'
                AND s.status IN ('active', 'past_due')
                AND (
                  s.current_period_end IS NULL
                  OR s.current_period_end + 86400 >= ?
                )
            )
            """
    if pro_filter is True:
        where.append(pro_exists_sql)
        params.append(now_ts)
    elif pro_filter is False:
        where.append(f"NOT ({pro_exists_sql})")
        params.append(now_ts)

    where_sql = " AND ".join(where)
    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS c FROM users u WHERE {where_sql}",
            params,
        ).fetchone()["c"]
        rows = conn.execute(
            f"""
            SELECT u.id, u.email, u.download_free_used, u.created_at,
                   s.plan AS sub_plan, s.status AS sub_status,
                   s.current_period_end AS sub_period_end,
                   s.stripe_subscription_id AS sub_stripe_id
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE {where_sql}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        ).fetchall()

    items = []
    for r in rows:
        uid = r["id"]
        items.append(
            {
                "id": uid,
                "email": r["email"],
                "is_pro": user_store.is_pro_user(uid),
                "download_free_used": int(r["download_free_used"] or 0),
                "download_free_limit": user_store.DOWNLOAD_FREE_LIMIT,
                "created_at": r["created_at"],
                "subscription": (
                    {
                        "plan": r["sub_plan"],
                        "status": r["sub_status"],
                        "current_period_end": r["sub_period_end"],
                        "has_stripe": bool(r["sub_stripe_id"]),
                    }
                    if r["sub_plan"] is not None
                    else None
                ),
            }
        )
    return {"total": int(total), "items": items, "limit": limit, "offset": offset}


def grant_pro(user_id: str) -> None:
    """人工开通 Pro：active、无到期（直至撤销）。可清空 period_end。"""
    updated_at = _now().isoformat()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO subscriptions (
                user_id, plan, status, stripe_subscription_id,
                stripe_price_id, current_period_end, updated_at
            ) VALUES (?, 'pro', 'active', NULL, NULL, NULL, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                plan = 'pro',
                status = 'active',
                current_period_end = NULL,
                updated_at = excluded.updated_at
            """,
            (user_id, updated_at),
        )


def revoke_pro(user_id: str) -> None:
    """人工撤销 Pro。"""
    updated_at = _now().isoformat()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO subscriptions (
                user_id, plan, status, stripe_subscription_id,
                stripe_price_id, current_period_end, updated_at
            ) VALUES (?, 'pro', 'canceled', NULL, NULL, NULL, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                status = 'canceled',
                updated_at = excluded.updated_at
            """,
            (user_id, updated_at),
        )


def system_metrics() -> dict[str, Any]:
    import psutil

    mem = psutil.virtual_memory()
    # interval=None 用非阻塞采样；首次可能偏低，admin UI 轮询后会稳
    cpu = psutil.cpu_percent(interval=0.1)
    try:
        load = list(psutil.getloadavg())
    except (AttributeError, OSError):
        load = None
    return {
        "cpu_percent": round(float(cpu), 1),
        "memory": {
            "total_mb": round(mem.total / (1024 * 1024), 1),
            "used_mb": round(mem.used / (1024 * 1024), 1),
            "percent": round(float(mem.percent), 1),
        },
        "load_avg": load,
        "cpu_count": psutil.cpu_count() or 1,
    }
