from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from app.schemas.beneficiary import BeneficiaryOut
from app.schemas.destination import DestinationOut


class PayoutCreate(BaseModel):
    beneficiary_id: str
    destination_id: str
    amount: int = Field(..., gt=0)  # minor units
    currency: str = Field(..., min_length=3, max_length=3)
    memo: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def _upper_iso(cls, v: str) -> str:
        v = v.upper()
        if not v.isalpha() or len(v) != 3:
            raise ValueError("invalid currency code")
        return v


class PayoutOut(BaseModel):
    id: str
    status: Literal["pending", "processing", "paid", "failed", "canceled"]
    amount: int
    currency: str
    beneficiary: BeneficiaryOut
    destination: DestinationOut
    memo: Optional[str] = None
    external_id: Optional[str] = None
    failure_code: Optional[str] = None
    failure_message: Optional[str] = None
    created_at: str
    idempotency_key: str
    
    # Stripe-specific fields
    stripe_payout_id: Optional[str] = None
    stripe_balance_transaction: Optional[str] = None
    arrival_date: Optional[str] = None
    processed_at: Optional[str] = None

    class Config:
        from_attributes = True


class PayoutList(BaseModel):
    items: list[PayoutOut]