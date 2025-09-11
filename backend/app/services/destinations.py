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
    
    # Extract last4 from account number or IBAN
    if payload.account_number:
        last4 = payload.account_number[-4:] if len(payload.account_number) >= 4 else payload.account_number
    elif payload.iban:
        # For IBAN, use last 4 characters
        last4 = payload.iban[-4:] if len(payload.iban) >= 4 else payload.iban
    else:
        last4 = "****"
    
    # Generate label if not provided
    if payload.label:
        label = payload.label
    elif payload.iban:
        label = f"{payload.country} IBAN ••••{last4}"
    else:
        label = f"{payload.country} ••••{last4}"
    
    destination = PayoutDestination(
        beneficiary_id=beneficiary_id,
        type=DestinationType.BANK_ACCOUNT,
        label=label,
        last4=last4,
        currency=payload.currency.upper(),
        country=payload.country,
        status=DestinationStatus.VERIFIED,  # Set to verified in dev mode
        account_number=payload.account_number,
        routing_number=payload.routing_number,
        iban=payload.iban,
        bic=payload.bic
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
        status=destination.status.value,
        account_number=destination.account_number,
        routing_number=destination.routing_number,
        iban=destination.iban,
        bic=destination.bic
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
            status=d.status.value,
            account_number=d.account_number,
            routing_number=d.routing_number,
            iban=d.iban,
            bic=d.bic
        )
        for d in destinations
    ]
