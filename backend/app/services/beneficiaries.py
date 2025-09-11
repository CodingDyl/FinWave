import hashlib
from sqlalchemy.orm import Session
from app.models.beneficiary import Beneficiary, BeneficiaryType
from app.schemas.beneficiary import BeneficiaryCreate, BeneficiaryOut


def create_beneficiary(db: Session, user_id: int, payload: BeneficiaryCreate) -> BeneficiaryOut:
    """Create a new beneficiary for a user."""
    # Hash email if provided
    email_hash = None
    if payload.email:
        email_hash = hashlib.sha256(payload.email.encode()).hexdigest()
    
    beneficiary = Beneficiary(
        user_id=user_id,
        type=BeneficiaryType(payload.type),
        name=payload.name,
        email_hash=email_hash,
        country=payload.country
    )
    
    db.add(beneficiary)
    db.commit()
    db.refresh(beneficiary)
    
    return BeneficiaryOut(
        id=beneficiary.id,
        type=beneficiary.type.value,
        name=beneficiary.name,
        email=payload.email,  # Return original email, not hash
        country=beneficiary.country
    )


def list_beneficiaries(db: Session, user_id: int) -> list[BeneficiaryOut]:
    """List all beneficiaries for a user."""
    beneficiaries = db.query(Beneficiary).filter(Beneficiary.user_id == user_id).all()
    
    return [
        BeneficiaryOut(
            id=b.id,
            type=b.type.value,
            name=b.name,
            email=None,  # Don't return email for security
            country=b.country
        )
        for b in beneficiaries
    ]
