from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db
from app.core.config import settings
from app.core.security import verify_signature
from app.services.webhooks import store_webhook_event
from app.integrations import stripe_client  # noqa
import stripe
import json

router = APIRouter()

@router.post("/provider")
async def receive_webhook(
    request: Request,
    db: Session = Depends(get_db),
    signature: str | None = Header(default=None, alias="Finwave-Signature"),
):
    body = await request.body()
    is_valid = verify_signature(body, signature or "", settings.webhook_secret, settings.webhook_tolerance_seconds)
    store_webhook_event(db, provider="provider", payload=(await request.json() if body else {}), signature_header=signature or "", valid=is_valid)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid signature or timestamp")
    return {"ok": True}

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
):
    payload = await request.body()
    if not settings.stripe_webhook_secret:
        # Accept unsigned only if you explicitly allow it in dev
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid signature: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    # Handle events you care about
    type_ = event["type"]
    data = event["data"]["object"]

    if type_ == "checkout.session.completed":
        # mark order paid, link to user, etc.
        pass
    elif type_ == "payment_intent.succeeded":
        # confirm payment in your DB
        pass
    elif type_ == "payment_intent.payment_failed":
        # log failure
        pass
    elif type_ == "payout.paid":
        # Handle successful payout
        from app.services.stripe_payouts import StripePayoutService
        from app.db.session import get_session
        with next(get_session()) as db:
            StripePayoutService.update_payout_from_webhook(db, data["id"], data)
    elif type_ == "payout.failed":
        # Handle failed payout
        from app.services.stripe_payouts import StripePayoutService
        from app.db.session import get_session
        with next(get_session()) as db:
            StripePayoutService.update_payout_from_webhook(db, data["id"], data)
    elif type_ == "payout.canceled":
        # Handle cancelled payout
        from app.services.stripe_payouts import StripePayoutService
        from app.db.session import get_session
        with next(get_session()) as db:
            StripePayoutService.update_payout_from_webhook(db, data["id"], data)
    # add others as needed

    return {"received": True}
