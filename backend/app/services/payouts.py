from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.payout import PayoutRequest, PayoutStatus
from app.models.beneficiary import Beneficiary
from app.models.destination import PayoutDestination
from app.schemas.payout import PayoutCreate

def create_or_get_payout(db: Session, user_id: int, idem_key: str, payload: PayoutCreate) -> PayoutRequest:
    """
    Idempotent creation using unique (user_id, idempotency_key).
    Safe under concurrency: one will succeed, others hit IntegrityError and fetch existing.
    """
    # First check if payout already exists with this idempotency key
    existing = (
        db.query(PayoutRequest)
        .filter(PayoutRequest.user_id == user_id, PayoutRequest.idempotency_key == idem_key)
        .first()
    )
    if existing:
        return existing
    
    # Verify beneficiary and destination belong to user
    beneficiary = db.query(Beneficiary).filter(
        Beneficiary.id == payload.beneficiary_id,
        Beneficiary.user_id == user_id
    ).first()
    if not beneficiary:
        raise ValueError("Beneficiary not found or not owned by user")
    
    destination = db.query(PayoutDestination).filter(
        PayoutDestination.id == payload.destination_id,
        PayoutDestination.beneficiary_id == payload.beneficiary_id
    ).first()
    if not destination:
        raise ValueError("Destination not found or not owned by beneficiary")
    
    pr = PayoutRequest(
        user_id=user_id,
        beneficiary_id=payload.beneficiary_id,
        destination_id=payload.destination_id,
        amount=payload.amount,
        currency=payload.currency,
        memo=payload.memo,
        idempotency_key=idem_key,
        status=PayoutStatus.PENDING,
    )
    db.add(pr)
    try:
        db.commit()
        db.refresh(pr)
        return pr
    except IntegrityError as e:
        db.rollback()
        # Race condition: another request created the same payout
        # Fetch and return the existing one
        existing = (
            db.query(PayoutRequest)
            .filter(PayoutRequest.user_id == user_id, PayoutRequest.idempotency_key == idem_key)
            .first()
        )
        if not existing:
            raise ValueError(f"Failed to create or retrieve payout with idempotency key: {str(e)}")
        return existing
