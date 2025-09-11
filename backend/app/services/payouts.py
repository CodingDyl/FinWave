from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.payout import PayoutRequest, PayoutStatus
from app.models.beneficiary import Beneficiary
from app.models.destination import PayoutDestination
from app.schemas.payout import PayoutCreate
from app.services.stripe_payouts import StripePayoutService

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


def process_payout_with_stripe(db: Session, payout_id: str) -> PayoutRequest:
    """
    Process a payout by creating it in Stripe and updating the database
    """
    payout = db.query(PayoutRequest).filter(PayoutRequest.id == payout_id).first()
    if not payout:
        raise ValueError(f"Payout {payout_id} not found")
    
    if payout.status != PayoutStatus.PENDING:
        raise ValueError(f"Payout {payout_id} is not in pending status")
    
    return StripePayoutService.process_payout_request(db, payout)


def cancel_payout(db: Session, payout_id: str) -> PayoutRequest:
    """
    Cancel a payout if it's in pending status
    """
    payout = db.query(PayoutRequest).filter(PayoutRequest.id == payout_id).first()
    if not payout:
        raise ValueError(f"Payout {payout_id} not found")
    
    if payout.status not in [PayoutStatus.PENDING, PayoutStatus.PROCESSING]:
        raise ValueError(f"Payout {payout_id} cannot be cancelled in current status: {payout.status}")
    
    if payout.external_id:
        # Cancel in Stripe if it has been created there
        return StripePayoutService.cancel_payout_request(db, payout)
    else:
        # Just update status if not yet created in Stripe
        payout.status = PayoutStatus.CANCELED
        db.commit()
        db.refresh(payout)
        return payout


def get_payout_status(db: Session, payout_id: str) -> dict:
    """
    Get detailed payout status including Stripe information
    """
    payout = db.query(PayoutRequest).filter(PayoutRequest.id == payout_id).first()
    if not payout:
        raise ValueError(f"Payout {payout_id} not found")
    
    result = {
        "id": payout.id,
        "status": payout.status.value.lower(),
        "amount": payout.amount,
        "currency": payout.currency,
        "created_at": payout.created_at.isoformat() if payout.created_at else None,
        "updated_at": payout.updated_at.isoformat() if payout.updated_at else None,
        "external_id": payout.external_id,
        "stripe_payout_id": payout.stripe_payout_id,
        "stripe_balance_transaction": payout.stripe_balance_transaction,
        "arrival_date": payout.arrival_date.isoformat() if payout.arrival_date else None,
        "processed_at": payout.processed_at.isoformat() if payout.processed_at else None,
        "failure_code": payout.failure_code,
        "failure_message": payout.failure_message,
    }
    
    # If we have a Stripe payout ID, get current status from Stripe
    if payout.stripe_payout_id:
        try:
            stripe_status = StripePayoutService.get_payout_status(payout.stripe_payout_id)
            result["stripe_status"] = stripe_status
        except Exception as e:
            result["stripe_error"] = str(e)
    
    return result
