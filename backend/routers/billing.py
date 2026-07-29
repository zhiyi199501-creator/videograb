"""Stripe 计费路由。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from services.auth import get_current_user
from services import billing

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.post("/checkout")
def checkout(user=Depends(get_current_user)):
    url = billing.create_checkout_session(user)
    return {"url": url}


@router.post("/portal")
def portal(user=Depends(get_current_user)):
    url = billing.create_portal_session(user)
    return {"url": url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    event = billing.construct_event(payload, sig)
    billing.handle_stripe_event(event)
    return JSONResponse({"received": True})
