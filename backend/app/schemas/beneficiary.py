from pydantic import BaseModel, EmailStr
from typing import Optional


class BeneficiaryCreate(BaseModel):
    type: str  # 'individual' | 'business'
    name: str
    email: Optional[EmailStr] = None
    country: Optional[str] = None


class BeneficiaryOut(BaseModel):
    id: str
    type: str
    name: str
    email: Optional[str] = None
    country: Optional[str] = None

    class Config:
        from_attributes = True
