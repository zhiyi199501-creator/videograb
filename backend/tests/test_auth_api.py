def test_register_login_me(client):
    email = "alice@example.com"
    password = "password123"

    reg = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert reg.status_code == 200
    body = reg.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == email
    assert body["user"]["is_pro"] is False
    assert body["user"]["download_free_remaining"] == 10
    token = body["access_token"]

    dup = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert dup.status_code == 409

    bad = client.post(
        "/api/auth/login",
        json={"email": email, "password": "wrong-password"},
    )
    assert bad.status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    assert login.json()["user"]["email"] == email

    me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == email

    unauth = client.get("/api/auth/me")
    assert unauth.status_code == 401


def test_register_rejects_bad_email(client):
    res = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "password123"},
    )
    assert res.status_code == 400
