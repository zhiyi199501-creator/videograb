from unittest.mock import patch

from services import auth
from services import billing
from services import users as user_store


def _user(db_path, email="pay@example.com"):
    return user_store.create_user(email, auth.hash_password("password123"))


def test_handle_checkout_activates_pro(db_path):
    user = _user(db_path)
    event = {
        "id": "evt_checkout_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "mode": "subscription",
                "customer": "cus_test_1",
                "subscription": None,
                "metadata": {"user_id": user["id"], "plan": "pro"},
                "client_reference_id": user["id"],
            }
        },
    }
    billing.handle_stripe_event(event)

    assert user_store.is_pro_user(user["id"]) is True
    sub = user_store.get_subscription(user["id"])
    assert sub["status"] == "active"
    refreshed = user_store.get_user_by_id(user["id"])
    assert refreshed["stripe_customer_id"] == "cus_test_1"


def test_handle_event_idempotent(db_path):
    user = _user(db_path, "idem@example.com")
    event = {
        "id": "evt_dup_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_dup_1",
                "mode": "subscription",
                "customer": "cus_dup_1",
                "subscription": None,
                "metadata": {"user_id": user["id"]},
                "client_reference_id": user["id"],
            }
        },
    }
    billing.handle_stripe_event(event)
    billing.handle_stripe_event(event)
    assert user_store.get_ai_free_used(user["id"]) == 0
    assert user_store.is_pro_user(user["id"]) is True


def test_subscription_deleted_marks_canceled(db_path):
    user = _user(db_path, "cancel@example.com")
    user_store.set_stripe_customer_id(user["id"], "cus_cancel")
    user_store.upsert_subscription(
        user["id"], plan="pro", status="active", stripe_subscription_id="sub_1"
    )
    event = {
        "id": "evt_del_1",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_1",
                "status": "active",
                "customer": "cus_cancel",
                "metadata": {"user_id": user["id"]},
                "items": {"data": []},
                "current_period_end": None,
            }
        },
    }
    billing.handle_stripe_event(event)
    assert user_store.is_pro_user(user["id"]) is False
    assert user_store.get_subscription(user["id"])["status"] == "canceled"


def test_webhook_endpoint_with_mocked_construct(client, db_path):
    user = _user(db_path, "hook@example.com")
    fake_event = {
        "id": "evt_http_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_http_1",
                "mode": "subscription",
                "customer": "cus_http_1",
                "subscription": None,
                "metadata": {"user_id": user["id"]},
                "client_reference_id": user["id"],
            }
        },
    }
    with patch(
        "services.billing.construct_event", return_value=fake_event
    ) as mocked:
        res = client.post(
            "/api/billing/webhook",
            data=b"{}",
            headers={"stripe-signature": "t=1,v1=test"},
        )
    assert res.status_code == 200
    assert res.json() == {"received": True}
    mocked.assert_called_once()
    assert user_store.is_pro_user(user["id"]) is True
