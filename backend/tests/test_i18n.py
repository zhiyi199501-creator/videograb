from i18n import parse_accept_language, t


def test_parse_accept_language_prefers_supported():
    assert parse_accept_language("en-US,en;q=0.9,zh-CN;q=0.8") == "en"
    assert parse_accept_language("zh-CN,zh;q=0.9") == "zh"
    assert parse_accept_language("xx-YY") == "zh"
    assert parse_accept_language(None) == "zh"


def test_auth_messages_differ_by_locale():
    zh = t("auth.bad_credentials", "zh")
    en = t("auth.bad_credentials", "en")
    assert "邮箱" in zh or "密码" in zh
    assert "email" in en.lower() or "password" in en.lower()
    assert zh != en


def test_quota_message_interpolates_limit():
    msg = t("download.quota_exhausted", "en", limit=3)
    assert "3" in msg
    assert "Pro" in msg


def test_login_error_respects_accept_language(client):
    zh = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
        headers={"Accept-Language": "zh"},
    )
    en = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "password123"},
        headers={"Accept-Language": "en"},
    )
    assert zh.status_code == 401
    assert en.status_code == 401
    assert zh.json()["detail"] != en.json()["detail"]
    assert "email" in en.json()["detail"].lower() or "password" in en.json()["detail"].lower()


def test_download_quota_error_english(client, monkeypatch):
    from unittest.mock import patch

    # register + burn free credits
    reg = client.post(
        "/api/auth/register",
        json={"email": "quota-en@example.com", "password": "password123"},
    )
    token = reg.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept-Language": "en",
        "Content-Type": "application/json",
    }

    # Create a ready job in store
    from models.job import JobStatus
    from services.ytdlp import job_store

    job_id = job_store.create("https://example.com/v")
    job_store.update(
        job_id,
        status=JobStatus.READY,
        formats=[{"format_id": "18", "ext": "mp4", "label": "360p", "vcodec": "avc1"}],
    )

    with patch("services.users.consume_download_free_credit", return_value=False):
        res = client.post(
            f"/api/jobs/{job_id}/download",
            json={"format_id": "18"},
            headers=headers,
        )
    assert res.status_code == 403
    detail = res.json()["detail"]
    assert "Free download" in detail or "quota" in detail.lower()
    assert "Pro" in detail
