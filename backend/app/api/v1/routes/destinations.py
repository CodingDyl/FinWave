from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.schemas.destination import DestinationCreateBank, DestinationOut
from app.services.destinations import create_bank_destination, list_destinations
from app.models.beneficiary import Beneficiary

router = APIRouter()


@router.post("/{beneficiary_id}/destinations", response_model=DestinationOut)
def create_destination_endpoint(
    beneficiary_id: str,
    payload: DestinationCreateBank,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a new bank destination for a beneficiary."""
    # Verify beneficiary belongs to user
    beneficiary = db.query(Beneficiary).filter(
        Beneficiary.id == beneficiary_id,
        Beneficiary.user_id == user.id
    ).first()
    if not beneficiary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Beneficiary not found"
        )
    
    try:
        return create_bank_destination(db, beneficiary_id, payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{beneficiary_id}/destinations", response_model=list[DestinationOut])
def list_destinations_endpoint(
    beneficiary_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """List all destinations for a beneficiary."""
    # Verify beneficiary belongs to user
    beneficiary = db.query(Beneficiary).filter(
        Beneficiary.id == beneficiary_id,
        Beneficiary.user_id == user.id
    ).first()
    if not beneficiary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Beneficiary not found"
        )
    
    return list_destinations(db, beneficiary_id)
