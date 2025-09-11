from pydantic import BaseModel
from typing import Optional


class DestinationCreateBank(BaseModel):
    type: str = "bank_account"
    country: str
    currency: str
    account_number: str
    routing_number: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    label: Optional[str] = None


class DestinationOut(BaseModel):
    id: str
    type: str  # 'bank_account' | 'card'
    label: str
    last4: Optional[str] = None
    currency: str
    country: Optional[str] = None
    status: str  # 'unverified' | 'verified'

    class Config:
        from_attributes = True
