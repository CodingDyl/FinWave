from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi_limiter.depends import RateLimiter

from app.api.v1.deps import get_db, get_current_user
from app.core.config import settings
from app.models.payout import PayoutRequest
from app.schemas.payout import PayoutCreate, PayoutOut, PayoutList, PayoutDestination
from app.services.payouts import create_or_get_payout

router = APIRouter()

def _rate_id(request: Request) -> str:
    return str(request.session.get("uid") or request.client.host or "anon")

_rate_deps = []
# Temporarily disable rate limiter to debug the issue
# if settings.app_env != "test":
#     _rate_deps = [Depends(RateLimiter(times=5, seconds=60, identifier=_rate_id))]

@router.post("", response_model=PayoutOut, dependencies=_rate_deps)
def create_payout(
    payload: PayoutCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    x_idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    if not x_idempotency_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="missing Idempotency-Key")
    pr: PayoutRequest = create_or_get_payout(db, user.id, x_idempotency_key, payload)
    return PayoutOut(
        id=str(pr.id), 
        status=pr.status.value.lower(), 
        amount=pr.amount, 
        currency=pr.currency,
        destination=payload.destination,
        created_at=pr.created_at.isoformat() if pr.created_at else "",
        idempotency_key=pr.idempotency_key
    )

@router.get("", response_model=PayoutList)
def list_payouts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = (
        db.query(PayoutRequest)
        .filter(PayoutRequest.user_id == user.id)
        .order_by(PayoutRequest.created_at.desc())
        .all()
    )
    return PayoutList(items=[
        PayoutOut(
            id=str(i.id), 
            status=i.status.value.lower(), 
            amount=i.amount, 
            currency=i.currency,
            destination=PayoutDestination(**i.destination_json),
            created_at=i.created_at.isoformat() if i.created_at else "",
            idempotency_key=i.idempotency_key
        ) for i in items
    ])
