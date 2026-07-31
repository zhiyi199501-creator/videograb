"""Stripe Checkout / Portal / Webhook 履约。"""

from __future__ import annotations

import logging
import os
from datetime import date
from typing import Any, Optional

import stripe
from fastapi import HTTPException

from services import users as user_store

logger = logging.getLogger(__name__)

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_PRO = os.environ.get("STRIPE_PRICE_PRO", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")

_PLACEHOLDER_VALUES = {
    "",
    "sk_test_xxx",
    "whsec_xxx",
    "price_xxx",
    "sk_live_xxx",
}


def _is_placeholder(value: str) -> bool:
    v = (value or "").strip()
    return v in _PLACEHOLDER_VALUES or v.endswith("_xxx")


def _stripe() -> None:
    if _is_placeholder(STRIPE_SECRET_KEY):
        raise HTTPException(
            status_code=503,
            detail="未配置有效的 STRIPE_SECRET_KEY（生产仍是示例占位符），无法发起支付",
        )
    stripe.api_key = STRIPE_SECRET_KEY


def _ensure_customer(user: dict[str, Any]) -> str:
    _stripe()
    existing = user.get("stripe_customer_id")
    if existing:
        return existing
    customer = stripe.Customer.create(
        email=user["email"],
        metadata={"user_id": user["id"]},
        idempotency_key=f"customer:{user['id']}",
    )
    user_store.set_stripe_customer_id(user["id"], customer.id)
    return customer.id


def create_checkout_session(user: dict[str, Any]) -> str:
    _stripe()
    if _is_placeholder(STRIPE_PRICE_PRO):
        raise HTTPException(
            status_code=503,
            detail="未配置有效的 STRIPE_PRICE_PRO（仍是示例占位符），请先在 Stripe 创建 Pro 价格",
        )
    if user_store.is_pro_user(user["id"]):
        raise HTTPException(status_code=400, detail="你已是 Pro 会员")

    try:
        customer_id = _ensure_customer(user)
        idem_key = f"checkout:{user['id']}:pro:{date.today().isoformat()}"

        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            client_reference_id=user["id"],
            line_items=[{"price": STRIPE_PRICE_PRO, "quantity": 1}],
            success_url=f"{FRONTEND_URL}/pricing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/pricing/cancel",
            metadata={"user_id": user["id"], "plan": "pro"},
            subscription_data={"metadata": {"user_id": user["id"], "plan": "pro"}},
            allow_promotion_codes=True,
            idempotency_key=idem_key,
        )
    except HTTPException:
        raise
    except stripe.AuthenticationError as exc:
        logger.exception("Stripe auth failed during checkout")
        raise HTTPException(
            status_code=503,
            detail="Stripe API Key 无效，请检查生产环境 STRIPE_SECRET_KEY",
        ) from exc
    except stripe.StripeError as exc:
        logger.exception("Stripe checkout failed")
        raise HTTPException(
            status_code=502,
            detail=f"Stripe 创建支付失败: {exc.user_message or str(exc)}",
        ) from exc

    if not session.url:
        raise HTTPException(status_code=500, detail="创建支付会话失败")
    return session.url


def create_portal_session(user: dict[str, Any]) -> str:
    _stripe()
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="尚无账单信息，请先订阅 Pro")
    portal = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{FRONTEND_URL}/pricing",
    )
    if not portal.url:
        raise HTTPException(status_code=500, detail="创建账单门户失败")
    return portal.url


def construct_event(payload: bytes, sig_header: Optional[str]) -> stripe.Event:
    _stripe()
    if _is_placeholder(STRIPE_WEBHOOK_SECRET):
        raise HTTPException(
            status_code=503,
            detail="未配置有效的 STRIPE_WEBHOOK_SECRET（仍是示例占位符）",
        )
    if not sig_header:
        raise HTTPException(status_code=400, detail="缺少 Stripe-Signature")
    try:
        return stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="无效 Webhook 载荷") from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Webhook 签名校验失败") from exc


def _as_dict(obj: Any) -> dict[str, Any]:
    """StripeObject 不支持 .get()；统一转成普通 dict 再履约。"""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    to_dict_recursive = getattr(obj, "to_dict_recursive", None)
    if callable(to_dict_recursive):
        data = to_dict_recursive()
        return data if isinstance(data, dict) else {}
    to_dict = getattr(obj, "to_dict", None)
    if callable(to_dict):
        data = to_dict()
        return data if isinstance(data, dict) else {}
    try:
        return dict(obj)
    except Exception:
        return {}


def _resolve_user_id_from_session(session: dict[str, Any]) -> str | None:
    meta = session.get("metadata") or {}
    if not isinstance(meta, dict):
        meta = _as_dict(meta)
    user_id = meta.get("user_id") or session.get("client_reference_id")
    if user_id:
        return str(user_id)
    customer_id = session.get("customer")
    if customer_id:
        user = user_store.get_user_by_stripe_customer(str(customer_id))
        if user:
            return user["id"]
    return None


def _period_end_from_subscription(sub: Any) -> int | None:
    if sub is None:
        return None
    if isinstance(sub, dict):
        return sub.get("current_period_end")
    return getattr(sub, "current_period_end", None)


def _status_from_subscription(sub: Any) -> str:
    raw = ""
    if isinstance(sub, dict):
        raw = str(sub.get("status") or "")
    else:
        raw = str(getattr(sub, "status", "") or "")
    mapping = {
        "active": "active",
        "trialing": "active",
        "past_due": "past_due",
        "canceled": "canceled",
        "unpaid": "past_due",
        "incomplete": "inactive",
        "incomplete_expired": "canceled",
        "paused": "inactive",
    }
    return mapping.get(raw, "inactive")


def _activate_from_checkout(session: dict[str, Any]) -> None:
    session = _as_dict(session)
    user_id = _resolve_user_id_from_session(session)
    if not user_id:
        logger.warning("checkout.session.completed missing user_id: %s", session.get("id"))
        return

    session_id = session.get("id")
    if session_id and not user_store.try_record_checkout_session(str(session_id), user_id):
        logger.info("Checkout session already fulfilled: %s", session_id)
        return

    customer_id = session.get("customer")
    if customer_id:
        user = user_store.get_user_by_id(user_id)
        if user and not user.get("stripe_customer_id"):
            user_store.set_stripe_customer_id(user_id, str(customer_id))

    subscription_id = session.get("subscription")
    period_end = None
    price_id = STRIPE_PRICE_PRO or None
    status = "active"

    if subscription_id:
        sub = _as_dict(stripe.Subscription.retrieve(str(subscription_id)))
        status = _status_from_subscription(sub)
        period_end = _period_end_from_subscription(sub)
        try:
            items = (sub.get("items") or {}).get("data") or []
            if items:
                price = items[0].get("price") if isinstance(items[0], dict) else None
                if isinstance(price, dict) and price.get("id"):
                    price_id = price.get("id")
        except Exception:
            logger.exception("Failed to read subscription price")

    user_store.upsert_subscription(
        user_id,
        plan="pro",
        status=status if status != "inactive" else "active",
        stripe_subscription_id=str(subscription_id) if subscription_id else None,
        stripe_price_id=price_id,
        current_period_end=int(period_end) if period_end else None,
    )
    logger.info("Activated Pro for user %s via checkout %s", user_id, session_id)


def _sync_subscription(sub_obj: Any) -> None:
    sub = _as_dict(sub_obj)

    meta = sub.get("metadata") or {}
    if not isinstance(meta, dict):
        meta = _as_dict(meta)
    user_id = meta.get("user_id")
    customer_id = sub.get("customer")

    if not user_id and customer_id:
        user = user_store.get_user_by_stripe_customer(str(customer_id))
        user_id = user["id"] if user else None

    if not user_id:
        logger.warning("subscription event missing user_id")
        return

    sub_id = sub.get("id")
    status = _status_from_subscription(sub)
    period_end = _period_end_from_subscription(sub)
    price_id = None
    try:
        items = (sub.get("items") or {}).get("data") or []
        if items:
            price = items[0].get("price") if isinstance(items[0], dict) else None
            if isinstance(price, dict):
                price_id = price.get("id")
            elif price:
                price_id = getattr(price, "id", None)
    except Exception:
        pass

    user_store.upsert_subscription(
        str(user_id),
        plan="pro",
        status=status,
        stripe_subscription_id=str(sub_id) if sub_id else None,
        stripe_price_id=price_id,
        current_period_end=int(period_end) if period_end else None,
    )


def handle_stripe_event(event: stripe.Event | dict[str, Any]) -> None:
    event_map = _as_dict(event)
    event_id = event_map.get("id")
    event_type = event_map.get("type")
    if not event_id or not event_type:
        logger.warning("Stripe event missing id/type: %s", event_map)
        return

    if not user_store.try_record_event(str(event_id), str(event_type)):
        logger.info("Skip duplicate Stripe event %s", event_id)
        return

    try:
        data = _as_dict(event_map.get("data"))
        data_object = _as_dict(data.get("object"))

        if event_type == "checkout.session.completed":
            if data_object.get("mode") == "subscription" or data_object.get(
                "subscription"
            ):
                _activate_from_checkout(data_object)
            return

        if event_type in (
            "customer.subscription.updated",
            "customer.subscription.deleted",
            "customer.subscription.created",
        ):
            if event_type == "customer.subscription.deleted":
                data_object = {**data_object, "status": "canceled"}
            _sync_subscription(data_object)
            return

        if event_type == "invoice.paid":
            sub_id = data_object.get("subscription")
            if sub_id:
                sub = stripe.Subscription.retrieve(str(sub_id))
                _sync_subscription(sub)
            return

        if event_type == "invoice.payment_failed":
            sub_id = data_object.get("subscription")
            if sub_id:
                sub = stripe.Subscription.retrieve(str(sub_id))
                _sync_subscription(sub)
                sub_map = _as_dict(sub)
                user_id = None
                meta = sub_map.get("metadata") or {}
                if isinstance(meta, dict):
                    user_id = meta.get("user_id")
                customer_id = sub_map.get("customer")
                if not user_id and customer_id:
                    user = user_store.get_user_by_stripe_customer(str(customer_id))
                    user_id = user["id"] if user else None
                if user_id:
                    user_store.upsert_subscription(
                        str(user_id),
                        status="past_due",
                        stripe_subscription_id=str(sub_id),
                    )
            return

        logger.info("Unhandled Stripe event type: %s", event_type)
    except Exception:
        # 履约失败时删掉幂等记录，允许 Stripe 重试真正完成开通
        user_store.delete_stripe_event(str(event_id))
        raise
