from pydantic import BaseModel, Field, field_validator
from typing import Literal

class PayoutDestination(BaseModel):
    type: Literal["bank_account"]  # extend later (wallet, card, etc.)
    last4: str = Field(..., min_length=4, max_length=4)

class PayoutCreate(BaseModel):
    amount: int = Field(..., gt=0)  # minor units
    currency: str = Field(..., min_length=3, max_length=3)
    destination: PayoutDestination

    @field_validator("currency")
    @classmethod
    def _upper_iso(cls, v: str) -> str:
        v = v.upper()
        if not v.isalpha() or len(v) != 3:
            raise ValueError("invalid currency code")
        return v

class PayoutOut(BaseModel):
    id: str
    status: str
    amount: int
    currency: str

class PayoutList(BaseModel):
    items: list[PayoutOut]
