from pydantic import BaseModel, field_validator, model_validator
from typing import Optional


class DestinationCreateBank(BaseModel):
    type: str = "bank_account"
    country: str
    currency: str
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    label: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_bank_details(self):
        """Ensure either account_number+routing_number OR iban is provided"""
        has_account_number = self.account_number is not None and self.account_number.strip() != ""
        has_iban = self.iban is not None and self.iban.strip() != ""
        
        if not has_account_number and not has_iban:
            raise ValueError("Either account_number or iban must be provided")
        
        if has_account_number and has_iban:
            raise ValueError("Provide either account_number+routing_number OR iban, not both")
        
        return self
    
    @field_validator('iban')
    @classmethod
    def validate_iban(cls, v):
        """Basic IBAN validation"""
        if v is not None and v.strip():
            # Remove spaces and convert to uppercase
            iban = v.replace(' ', '').upper()
            if len(iban) < 15 or len(iban) > 34:
                raise ValueError("IBAN must be between 15 and 34 characters")
            if not iban.isalnum():
                raise ValueError("IBAN must contain only letters and numbers")
            return iban
        return v


class DestinationOut(BaseModel):
    id: str
    type: str  # 'bank_account' | 'card'
    label: str
    last4: Optional[str] = None
    currency: str
    country: Optional[str] = None
    status: str  # 'unverified' | 'verified'
    
    # Bank account details
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None

    class Config:
        from_attributes = True
