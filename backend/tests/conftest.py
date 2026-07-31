"""Pytest fixtures: temp SQLite + FastAPI TestClient.

Environment must be set before importing application modules that read
JWT_SECRET / DATABASE_PATH / Stripe keys at import time.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# backend/ on sys.path (pytest.ini also sets pythonpath=.)
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

os.environ["JWT_SECRET"] = "ci-test-secret-min-32-chars-long!!"
os.environ["JWT_EXPIRE_HOURS"] = "24"
os.environ["DATABASE_PATH"] = str(
    Path(os.environ.get("DATABASE_PATH", "/tmp/videograb-pytest-placeholder.db"))
)
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_ci_placeholder")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_ci_placeholder")
os.environ.setdefault("STRIPE_PRICE_PRO", "price_ci_placeholder")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("DEEPSEEK_API_KEY", "")
# Avoid loading a developer .env that could override test secrets mid-import.
os.environ.setdefault("DOTENV_OVERRIDE", "0")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "app.db"
    monkeypatch.setenv("DATABASE_PATH", str(path))
    import db

    monkeypatch.setattr(db, "DATABASE_PATH", path)
    db.init_db()
    return path


@pytest.fixture()
def client(db_path, monkeypatch):
    """HTTP client with lifespan startup (init_db already done on db_path)."""
    import db
    import main

    monkeypatch.setattr(db, "DATABASE_PATH", db_path)
    # Re-bind JWT secret in case modules were imported before env was set.
    import services.auth as auth_mod
    import services.billing as billing_mod

    monkeypatch.setattr(
        auth_mod, "JWT_SECRET", os.environ["JWT_SECRET"]
    )
    monkeypatch.setattr(
        billing_mod, "STRIPE_SECRET_KEY", os.environ["STRIPE_SECRET_KEY"]
    )
    monkeypatch.setattr(
        billing_mod,
        "STRIPE_WEBHOOK_SECRET",
        os.environ["STRIPE_WEBHOOK_SECRET"],
    )
    monkeypatch.setattr(
        billing_mod, "STRIPE_PRICE_PRO", os.environ["STRIPE_PRICE_PRO"]
    )

    with TestClient(main.app) as test_client:
        yield test_client
