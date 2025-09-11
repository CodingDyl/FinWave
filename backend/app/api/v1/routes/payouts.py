from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from fastapi_limiter.depends import RateLimiter
import logging

from app.api.v1.deps import get_db, get_current_user
from app.core.config import settings
from app.models.payout import PayoutRequest
from app.models.beneficiary import Beneficiary
from app.models.destination import PayoutDestination
from app.schemas.payout import PayoutCreate, PayoutOut, PayoutList
from app.schemas.beneficiary import BeneficiaryOut
from app.schemas.destination import DestinationOut
from app.services.payouts import create_or_get_payout

logger = logging.getLogger(__name__)

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
    
    logger.info(f"Creating payout for user {user.id} with idempotency key {x_idempotency_key}")
    logger.info(f"Payload: {payload}")
    
    try:
        pr: PayoutRequest = create_or_get_payout(db, user.id, x_idempotency_key, payload)
        
        # Load related data
        db.refresh(pr)
        payout_with_relations = (
            db.query(PayoutRequest)
            .options(
                joinedload(PayoutRequest.beneficiary),
                joinedload(PayoutRequest.destination)
            )
            .filter(PayoutRequest.id == pr.id)
            .first()
        )
        
        return PayoutOut(
            id=str(payout_with_relations.id), 
            status=payout_with_relations.status.value.lower(), 
            amount=payout_with_relations.amount, 
            currency=payout_with_relations.currency,
            beneficiary=BeneficiaryOut(
                id=payout_with_relations.beneficiary.id,
                type=payout_with_relations.beneficiary.type.value,
                name=payout_with_relations.beneficiary.name,
                email=None,  # Don't return email for security
                country=payout_with_relations.beneficiary.country
            ),
            destination=DestinationOut(
                id=payout_with_relations.destination.id,
                type=payout_with_relations.destination.type.value,
                label=payout_with_relations.destination.label,
                last4=payout_with_relations.destination.last4,
                currency=payout_with_relations.destination.currency,
                country=payout_with_relations.destination.country,
                status=payout_with_relations.destination.status.value
            ),
            memo=payout_with_relations.memo,
            external_id=payout_with_relations.external_id,
            failure_code=payout_with_relations.failure_code,
            failure_message=payout_with_relations.failure_message,
            created_at=payout_with_relations.created_at.isoformat() if payout_with_relations.created_at else "",
            idempotency_key=payout_with_relations.idempotency_key
        )
    except ValueError as e:
        logger.error(f"Validation error creating payout: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating payout: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("", response_model=PayoutList)
def list_payouts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = (
        db.query(PayoutRequest)
        .options(
            joinedload(PayoutRequest.beneficiary),
            joinedload(PayoutRequest.destination)
        )
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
            beneficiary=BeneficiaryOut(
                id=i.beneficiary.id,
                type=i.beneficiary.type.value,
                name=i.beneficiary.name,
                email=None,  # Don't return email for security
                country=i.beneficiary.country
            ),
            destination=DestinationOut(
                id=i.destination.id,
                type=i.destination.type.value,
                label=i.destination.label,
                last4=i.destination.last4,
                currency=i.destination.currency,
                country=i.destination.country,
                status=i.destination.status.value
            ),
            memo=i.memo,
            external_id=i.external_id,
            failure_code=i.failure_code,
            failure_message=i.failure_message,
            created_at=i.created_at.isoformat() if i.created_at else "",
            idempotency_key=i.idempotency_key
        ) for i in items
    ])
