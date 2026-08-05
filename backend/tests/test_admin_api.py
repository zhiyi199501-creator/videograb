"""Admin API：鉴权、Pro 人工增删、埋点与 overview。"""

from __future__ import annotations


def _register(client, email: str, password: str = "password123"):
    res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()


def test_admin_forbidden_without_whitelist(client):
    data = _register(client, "user@example.com")
    token = data["access_token"]
    assert data["user"]["is_admin"] is False

    res = client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_admin_overview_and_pro_grant_revoke(client, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "admin@example.com")
    import services.auth as auth_mod

    # is_admin_email reads env at call time via admin_emails() — no patch needed
    assert auth_mod.is_admin_email("admin@example.com")

    admin = _register(client, "admin@example.com")
    assert admin["user"]["is_admin"] is True
    admin_token = admin["access_token"]

    target = _register(client, "member@example.com")
    user_id = target["user"]["id"]
    assert target["user"]["is_pro"] is False

    grant = client.post(
        f"/api/admin/users/{user_id}/pro",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"action": "grant"},
    )
    assert grant.status_code == 200, grant.text
    assert grant.json()["user"]["is_pro"] is True

    users = client.get(
        "/api/admin/users?pro=1",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert users.status_code == 200
    emails = [u["email"] for u in users.json()["items"]]
    assert "member@example.com" in emails

    revoke = client.post(
        f"/api/admin/users/{user_id}/pro",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"action": "revoke"},
    )
    assert revoke.status_code == 200
    assert revoke.json()["user"]["is_pro"] is False

    overview = client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert overview.status_code == 200
    body = overview.json()
    assert body["users_total"] >= 2
    assert "pv_today" in body


def test_pageview_and_auth_events(client, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "ops@example.com")

    pv = client.post(
        "/api/analytics/pageview",
        json={"path": "/", "visitor_id": "visitor-test-001", "locale": "zh"},
    )
    assert pv.status_code == 200
    assert pv.json()["ok"] is True

    bad = client.post(
        "/api/analytics/pageview",
        json={"path": "not-a-path", "visitor_id": "x"},
    )
    # validation or ok:false
    assert bad.status_code in (200, 422)

    _register(client, "ops@example.com")
    login = client.post(
        "/api/auth/login",
        json={"email": "ops@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    failed = client.post(
        "/api/auth/login",
        json={"email": "ops@example.com", "password": "wrong-password"},
    )
    assert failed.status_code == 401

    logins = client.get(
        "/api/admin/logins",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logins.status_code == 200
    events = {e["event"] for e in logins.json()["items"]}
    assert "register" in events
    assert "login" in events
    assert "login_failed" in events

    visits = client.get(
        "/api/admin/visits?days=7",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert visits.status_code == 200
    assert visits.json()["daily"]
    assert any(p["path"] == "/" for p in visits.json()["top_paths"])


def test_admin_system_metrics(client, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "sys@example.com")
    data = _register(client, "sys@example.com")
    token = data["access_token"]
    res = client.get(
        "/api/admin/system",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "cpu_percent" in body
    assert "memory" in body
    assert body["memory"]["total_mb"] > 0
