from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.schemas.beneficiary import BeneficiaryCreate, BeneficiaryOut
from app.services.beneficiaries import create_beneficiary, list_beneficiaries

router = APIRouter()


@router.post("", response_model=BeneficiaryOut)
def create_beneficiary_endpoint(
    payload: BeneficiaryCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a new beneficiary for the current user."""
    try:
        return create_beneficiary(db, user.id, payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=list[BeneficiaryOut])
def list_beneficiaries_endpoint(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """List all beneficiaries for the current user."""
    return list_beneficiaries(db, user.id)
