from fastapi import APIRouter, Depends, Header
from app.api.v1.deps import get_db, get_current_user
from app.schemas.payout import PayoutCreate, PayoutOut, PayoutList
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("", response_model=PayoutOut)
def create_payout(
    payload: PayoutCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    x_idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    # will implement: rate limit, idempotency, validation
    raise NotImplementedError

@router.get("", response_model=PayoutList)
def list_payouts(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    raise NotImplementedError
