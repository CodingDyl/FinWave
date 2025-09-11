from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.integrations import stripe_client  # noqa: F401 (ensures api_key set)
import stripe

router = APIRouter(prefix="/api/v1/stripe", tags=["stripe"])

class CheckoutCreateIn(BaseModel):
    price_id: str | None = None
    amount: int | None = None   # in cents
    currency: str = "usd"
    mode: str = "payment"       # or 'subscription'
    success_url: str
    cancel_url: str

@router.post("/create-checkout-session")
def create_checkout_session(payload: CheckoutCreateIn):
    try:
        if payload.price_id:
            line_items=[{"price": payload.price_id, "quantity": 1}]
        else:
            assert payload.amount and payload.currency
            line_items=[{
                "price_data": {
                    "currency": payload.currency,
                    "product_data": {"name": "Custom amount"},
                    "unit_amount": payload.amount,
                },
                "quantity": 1,
            }]

        session = stripe.checkout.Session.create(
            mode=payload.mode,
            line_items=line_items,
            success_url=payload.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=payload.cancel_url,
        )
        return {"id": session["id"], "url": session["url"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
