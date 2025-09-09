from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal

class PayoutCreate(BaseModel):
    amount: Decimal
    currency: str
    recipient_name: str
    recipient_account: str
    description: Optional[str] = None

class PayoutOut(BaseModel):
    id: int
    amount: Decimal
    currency: str
    recipient_name: str
    recipient_account: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PayoutList(BaseModel):
    payouts: list[PayoutOut]
    total: int
    page: int
    size: int
