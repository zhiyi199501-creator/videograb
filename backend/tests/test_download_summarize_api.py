from unittest.mock import patch

from services import users as user_store
from services.ytdlp import job_store


def _register(client, email="download@example.com"):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123"},
    )
    assert res.status_code == 200
    return res.json()


def _ready_job() -> str:
    job_id = job_store.create("https://example.com/video")
    job_store.update(
        job_id,
        status="ready",
        formats=[],
        title="Test video",
    )
    return job_id


def test_download_requires_login_and_consumes_credit(client):
    job_id = _ready_job()
    res = client.post(f"/api/jobs/{job_id}/download", json={})
    assert res.status_code == 401

    data = _register(client)
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with patch("services.ytdlp.download_video"):
        res = client.post(
            f"/api/jobs/{job_id}/download",
            json={},
            headers=headers,
        )
    assert res.status_code == 200
    assert user_store.get_download_free_used(data["user"]["id"]) == 1


def test_download_quota_exhausted_returns_403(client):
    data = _register(client, "quota@example.com")
    uid = data["user"]["id"]
    for _ in range(user_store.DOWNLOAD_FREE_LIMIT):
        assert user_store.consume_download_free_credit(uid) is True

    job_id = _ready_job()
    res = client.post(
        f"/api/jobs/{job_id}/download",
        json={},
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert res.status_code == 403
    assert "免费下载次数已用完" in res.json()["detail"]


def test_file_download_requires_login(client):
    data = _register(client, "file@example.com")
    job_id = _ready_job()

    res = client.get(f"/api/jobs/{job_id}/file")
    assert res.status_code == 401

    res = client.get(
        f"/api/jobs/{job_id}/file",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert res.status_code == 400


def test_summarize_and_chat_are_free_without_login(client):
    job_id = job_store.create("https://example.com/video")

    res = client.get(f"/api/jobs/{job_id}/summarize")
    assert res.status_code == 400  # pending job，而非 401
    assert "解析" in res.json()["detail"] or "parsed" in res.json()["detail"].lower()

    en = client.get(
        f"/api/jobs/{job_id}/summarize",
        headers={"Accept-Language": "en"},
    )
    assert en.status_code == 400
    assert "parsed" in en.json()["detail"].lower() or "try again" in en.json()["detail"].lower()

    res = client.post("/api/jobs/missing/chat", json={"question": "hi"})
    assert res.status_code == 404
    assert res.json()["detail"] in ("任务不存在", "Job not found")

    en404 = client.post(
        "/api/jobs/missing/chat",
        json={"question": "hi"},
        headers={"Accept-Language": "en"},
    )
    assert en404.status_code == 404
    assert en404.json()["detail"] == "Job not found"


def test_summarize_messages_cover_locales():
    from i18n import t

    assert "总结" in t("summarize.start", "zh") or "…" in t("summarize.start", "zh")
    assert "summary" in t("summarize.start", "en").lower()
    assert t("job.not_found", "en") == "Job not found"
