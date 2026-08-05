"""SQLite 初始化与连接。"""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

_DEFAULT_DB = Path(__file__).resolve().parent / "data" / "app.db"
DATABASE_PATH = Path(os.environ.get("DATABASE_PATH", str(_DEFAULT_DB)))


def _connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DATABASE_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                stripe_customer_id TEXT,
                download_free_used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                plan TEXT NOT NULL DEFAULT 'pro',
                status TEXT NOT NULL DEFAULT 'inactive',
                stripe_subscription_id TEXT,
                stripe_price_id TEXT,
                current_period_end INTEGER,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stripe_events (
                event_id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                processed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS checkout_sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_stripe_customer
                ON users(stripe_customer_id);

            CREATE TABLE IF NOT EXISTS pageviews (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                locale TEXT,
                visitor_id TEXT NOT NULL,
                user_id TEXT,
                ip_hash TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_pageviews_created
                ON pageviews(created_at);
            CREATE INDEX IF NOT EXISTS idx_pageviews_path
                ON pageviews(path);

            CREATE TABLE IF NOT EXISTS auth_events (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                email TEXT NOT NULL,
                event TEXT NOT NULL,
                ip_hash TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_auth_events_created
                ON auth_events(created_at);
            """
        )
        # 兼容已有库：补齐下载额度；去掉已废弃的 AI 次数字段
        cols = {
            row[1]
            for row in conn.execute("PRAGMA table_info(users)").fetchall()
        }
        if "download_free_used" not in cols:
            conn.execute(
                "ALTER TABLE users ADD COLUMN download_free_used INTEGER NOT NULL DEFAULT 0"
            )
        if "ai_free_used" in cols:
            conn.execute("ALTER TABLE users DROP COLUMN ai_free_used")
