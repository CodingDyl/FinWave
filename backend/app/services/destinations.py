from sqlalchemy.orm import Session
from app.models.destination import PayoutDestination, DestinationType, DestinationStatus
from app.models.beneficiary import Beneficiary
from app.schemas.destination import DestinationCreateBank, DestinationOut


def create_bank_destination(db: Session, beneficiary_id: str, payload: DestinationCreateBank) -> DestinationOut:
    """Create a new bank destination for a beneficiary."""
    # Verify beneficiary exists
    beneficiary = db.query(Beneficiary).filter(Beneficiary.id == beneficiary_id).first()
    if not beneficiary:
        raise ValueError("Beneficiary not found")
    
    # Extract last4 from account number
    last4 = payload.account_number[-4:] if len(payload.account_number) >= 4 else payload.account_number
    
    # Generate label if not provided
    label = payload.label or f"{payload.country} ••••{last4}"
    
    destination = PayoutDestination(
        beneficiary_id=beneficiary_id,
        type=DestinationType.BANK_ACCOUNT,
        label=label,
        last4=last4,
        currency=payload.currency.upper(),
        country=payload.country,
        status=DestinationStatus.VERIFIED  # Set to verified in dev mode
    )
    
    db.add(destination)
    db.commit()
    db.refresh(destination)
    
    return DestinationOut(
        id=destination.id,
        type=destination.type.value,
        label=destination.label,
        last4=destination.last4,
        currency=destination.currency,
        country=destination.country,
        status=destination.status.value
    )


def list_destinations(db: Session, beneficiary_id: str) -> list[DestinationOut]:
    """List all destinations for a beneficiary."""
    destinations = db.query(PayoutDestination).filter(PayoutDestination.beneficiary_id == beneficiary_id).all()
    
    return [
        DestinationOut(
            id=d.id,
            type=d.type.value,
            label=d.label,
            last4=d.last4,
            currency=d.currency,
            country=d.country,
            status=d.status.value
        )
        for d in destinations
    ]
