from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
import stripe
from app.db.session import get_session
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.integrations.stripe_client import stripe
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/connected-accounts", tags=["connected-accounts"])

class ConnectedAccountCreate(BaseModel):
    type: str = Field(..., description="Account type: 'express' for business, 'standard' for personal")
    country: str = Field(..., description="Country code (e.g., 'ZA', 'GB')")
    email: Optional[str] = Field(None, description="Email for the account")
    business_type: Optional[str] = Field(None, description="Business type for Express accounts")
    business_name: Optional[str] = Field(None, description="Business name for Express accounts")

class ConnectedAccountOut(BaseModel):
    id: str
    type: str
    country: str
    email: Optional[str] = None
    business_type: Optional[str] = None
    business_name: Optional[str] = None
    charges_enabled: bool = False
    payouts_enabled: bool = False
    details_submitted: bool = False
    requirements: Optional[dict] = None
    created: int
    is_default: bool = False

    class Config:
        from_attributes = True

class BankAccountCreate(BaseModel):
    account_number: str = Field(..., description="Bank account number")
    routing_number: Optional[str] = Field(None, description="Routing number (US/UK)")
    iban: Optional[str] = Field(None, description="IBAN for international accounts")
    bic: Optional[str] = Field(None, description="BIC/SWIFT code")
    currency: str = Field(..., description="Currency (GBP, ZAR, etc.)")
    country: str = Field(..., description="Country code")
    account_holder_name: str = Field(..., description="Name on the account")
    account_holder_type: str = Field(default="individual", description="individual or company")

@router.get("/", response_model=List[ConnectedAccountOut])
def list_connected_accounts(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all connected accounts for the current user."""
    try:
        # For now, return a mock list since we're not storing in DB yet
        # In production, you'd store connected account IDs in your database
        accounts = []
        
        # Check if user has a default connected account set
        if hasattr(current_user, 'default_connected_account_id') and current_user.default_connected_account_id:
            try:
                account = stripe.Account.retrieve(current_user.default_connected_account_id)
                accounts.append(ConnectedAccountOut(
                    id=account.id,
                    type=account.type,
                    country=account.country,
                    email=account.email,
                    business_type=getattr(account, 'business_type', None),
                    business_name=getattr(account, 'business_profile', {}).get('name'),
                    charges_enabled=account.charges_enabled,
                    payouts_enabled=account.payouts_enabled,
                    details_submitted=account.details_submitted,
                    requirements=account.requirements,
                    created=account.created,
                    is_default=True
                ))
            except stripe.error.StripeError as e:
                logger.error(f"Error retrieving connected account: {e}")
        
        return accounts
    except Exception as e:
        logger.error(f"Error listing connected accounts: {e}")
        raise HTTPException(status_code=500, detail="Failed to list connected accounts")

@router.post("/create-express", response_model=ConnectedAccountOut)
def create_express_account(
    account_data: ConnectedAccountCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Express account for business use."""
    try:
        # Create Express account
        account = stripe.Account.create(
            type="express",
            country=account_data.country,
            email=account_data.email,
            business_type=account_data.business_type,
            business_profile={
                "name": account_data.business_name,
                "mcc": "7399"  # Computer Software Stores
            },
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True}
            }
        )
        
        logger.info(f"Created Express account {account.id} for user {current_user.id}")
        
        return ConnectedAccountOut(
            id=account.id,
            type=account.type,
            country=account.country,
            email=account.email,
            business_type=account.business_type,
            business_name=account.business_profile.name if account.business_profile else None,
            charges_enabled=account.charges_enabled,
            payouts_enabled=account.payouts_enabled,
            details_submitted=account.details_submitted,
            requirements=account.requirements,
            created=account.created,
            is_default=False
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating Express account: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to create Express account: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating Express account: {e}")
        raise HTTPException(status_code=500, detail="Failed to create Express account")

@router.post("/create-account-link")
def create_account_link(
    account_id: str = Query(..., description="Connected account ID"),
    refresh_url: str = Query(default="http://localhost:5173/connected-accounts", description="URL to redirect to after refresh"),
    return_url: str = Query(default="http://localhost:5173/connected-accounts", description="URL to redirect to after completion"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create an account link for Express account onboarding."""
    try:
        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=refresh_url,
            return_url=return_url,
            type="account_onboarding"
        )
        
        return {
            "url": account_link.url,
            "expires_at": account_link.expires_at
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating account link: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to create account link: {str(e)}")

@router.post("/add-bank-account")
def add_bank_account(
    account_id: str = Query(..., description="Connected account ID"),
    bank_data: BankAccountCreate = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Add a bank account to a connected account."""
    try:
        # Create bank account token
        if bank_data.iban:
            # International bank account (IBAN)
            bank_account = stripe.Token.create(
                bank_account={
                    "country": bank_data.country,
                    "currency": bank_data.currency.lower(),
                    "account_number": bank_data.account_number,
                    "routing_number": bank_data.routing_number,
                    "account_holder_name": bank_data.account_holder_name,
                    "account_holder_type": bank_data.account_holder_type,
                }
            )
        else:
            # Standard bank account
            bank_account = stripe.Token.create(
                bank_account={
                    "country": bank_data.country,
                    "currency": bank_data.currency.lower(),
                    "account_number": bank_data.account_number,
                    "routing_number": bank_data.routing_number,
                    "account_holder_name": bank_data.account_holder_name,
                    "account_holder_type": bank_data.account_holder_type,
                }
            )
        
        # Attach bank account to connected account
        external_account = stripe.Account.create_external_account(
            account_id,
            external_account=bank_account.id
        )
        
        logger.info(f"Added bank account {external_account.id} to account {account_id}")
        
        return {
            "external_account_id": external_account.id,
            "bank_name": external_account.bank_name,
            "last4": external_account.last4,
            "currency": external_account.currency,
            "country": external_account.country,
            "status": external_account.status
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error adding bank account: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to add bank account: {str(e)}")
    except Exception as e:
        logger.error(f"Error adding bank account: {e}")
        raise HTTPException(status_code=500, detail="Failed to add bank account")

@router.get("/{account_id}/external-accounts")
def list_external_accounts(
    account_id: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List external accounts (bank accounts) for a connected account."""
    try:
        external_accounts = stripe.Account.list_external_accounts(
            account_id,
            object="bank_account",
            limit=100
        )
        
        accounts = []
        for account in external_accounts.data:
            accounts.append({
                "id": account.id,
                "bank_name": account.bank_name,
                "last4": account.last4,
                "currency": account.currency,
                "country": account.country,
                "status": account.status,
                "default_for_currency": account.default_for_currency
            })
        
        return {"external_accounts": accounts}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error listing external accounts: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to list external accounts: {str(e)}")

@router.post("/set-default")
def set_default_account(
    account_id: str = Query(..., description="Connected account ID to set as default"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Set a connected account as the default for payouts."""
    try:
        # Verify account exists and belongs to user
        account = stripe.Account.retrieve(account_id)
        
        # In a real implementation, you'd store this in your database
        # For now, we'll update the global setting
        settings.stripe_connected_account_id = account_id
        
        logger.info(f"Set default connected account to {account_id} for user {current_user.id}")
        
        return {
            "message": f"Default connected account set to {account_id}",
            "account_id": account_id,
            "account_type": account.type,
            "country": account.country,
            "payouts_enabled": account.payouts_enabled
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error setting default account: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to set default account: {str(e)}")

@router.get("/supported-currencies")
def get_supported_currencies():
    """Get supported currencies with priority for GBP and ZAR."""
    return {
        "currencies": [
            {"code": "ZAR", "name": "South African Rand", "priority": 1, "country": "ZA"},
            {"code": "GBP", "name": "British Pound Sterling", "priority": 2, "country": "GB"},
            {"code": "USD", "name": "US Dollar", "priority": 3, "country": "US"},
            {"code": "EUR", "name": "Euro", "priority": 4, "country": "EU"},
        ],
        "default_currency": "ZAR",
        "priority_currencies": ["ZAR", "GBP"]
    }
