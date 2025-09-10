from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.payout import PayoutRequest, PayoutStatus
from app.schemas.payout import PayoutCreate

def create_or_get_payout(db: Session, user_id: int, idem_key: str, payload: PayoutCreate) -> PayoutRequest:
    """
    Idempotent creation using unique (user_id, idempotency_key).
    Safe under concurrency: one will succeed, others hit IntegrityError and fetch existing.
    """
    pr = PayoutRequest(
        user_id=user_id,
        amount=payload.amount,
        currency=payload.currency,
        destination_json=payload.destination.model_dump(),
        idempotency_key=idem_key,
        status=PayoutStatus.PENDING,
    )
    db.add(pr)
    try:
        db.commit()
        db.refresh(pr)
        return pr
    except IntegrityError:
        db.rollback()
        # Already exists: fetch and return
        return (
            db.query(PayoutRequest)
            .filter(PayoutRequest.user_id == user_id, PayoutRequest.idempotency_key == idem_key)
            .one()
        )
