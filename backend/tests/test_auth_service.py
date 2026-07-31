import pytest
from fastapi import HTTPException

from services import auth


def test_hash_and_verify_password():
    hashed = auth.hash_password("secret-pass-1")
    assert hashed != "secret-pass-1"
    assert auth.verify_password("secret-pass-1", hashed) is True
    assert auth.verify_password("wrong-pass", hashed) is False


def test_verify_password_rejects_garbage():
    assert auth.verify_password("x", "not-a-bcrypt-hash") is False


def test_create_and_decode_token():
    token = auth.create_access_token("user-1", "a@example.com")
    payload = auth.decode_token(token)
    assert payload["sub"] == "user-1"
    assert payload["email"] == "a@example.com"
    assert "exp" in payload


def test_decode_token_rejects_bad_token():
    with pytest.raises(HTTPException) as exc:
        auth.decode_token("not.a.valid.jwt")
    assert exc.value.status_code == 401
