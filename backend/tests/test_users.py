import time
from datetime import date, timedelta

from services import auth
from services import users as user_store


def _make_user(email: str = "u@example.com", password: str = "password123"):
    return user_store.create_user(email, auth.hash_password(password))


def test_create_user_and_lookup(db_path):
    user = _make_user()
    assert user_store.get_user_by_email("u@example.com")["id"] == user["id"]
    assert user_store.get_user_by_id(user["id"])["email"] == "u@example.com"


def test_download_free_limit_and_consume(db_path):
    user = _make_user("free@example.com")
    uid = user["id"]
    assert user_store.DOWNLOAD_FREE_LIMIT == 10
    assert user_store.can_download(uid) is True
    assert user_store.is_pro_user(uid) is False

    for i in range(10):
        assert user_store.consume_download_free_credit(uid) is True
        assert user_store.get_download_free_used(uid) == i + 1

    assert user_store.can_download(uid) is False
    assert user_store.consume_download_free_credit(uid) is False
    assert user_store.get_download_free_used(uid) == 10


def test_download_quota_resets_next_day(db_path, monkeypatch):
    user = _make_user("daily@example.com")
    uid = user["id"]
    for _ in range(10):
        assert user_store.consume_download_free_credit(uid) is True
    assert user_store.can_download(uid) is False

    today = user_store._quota_day()
    monkeypatch.setattr(
        user_store,
        "_quota_day",
        lambda: (date.fromisoformat(today) + timedelta(days=1)).isoformat(),
    )
    assert user_store.get_download_free_used(uid) == 0
    assert user_store.can_download(uid) is True
    assert user_store.consume_download_free_credit(uid) is True
    assert user_store.get_download_free_used(uid) == 1


def test_pro_user_skips_free_download_credit(db_path):
    user = _make_user("pro@example.com")
    uid = user["id"]
    user_store.upsert_subscription(
        uid,
        plan="pro",
        status="active",
        current_period_end=int(time.time()) + 86400 * 30,
    )
    assert user_store.is_pro_user(uid) is True
    assert user_store.can_download(uid) is True
    assert user_store.consume_download_free_credit(uid) is True
    assert user_store.get_download_free_used(uid) == 0


def test_expired_subscription_not_pro(db_path):
    user = _make_user("expired@example.com")
    uid = user["id"]
    user_store.upsert_subscription(
        uid,
        plan="pro",
        status="active",
        current_period_end=int(time.time()) - 86400 * 3,
    )
    assert user_store.is_pro_user(uid) is False


def test_try_record_event_idempotent(db_path):
    assert user_store.try_record_event("evt_1", "checkout.session.completed") is True
    assert user_store.try_record_event("evt_1", "checkout.session.completed") is False
