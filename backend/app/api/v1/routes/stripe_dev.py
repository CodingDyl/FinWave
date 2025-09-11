from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, constr
from typing import Optional
from app.deps.dev_only import ensure_dev
from app.integrations.stripe_client import stripe
from app.core.config import settings

router = APIRouter(prefix="/api/v1/stripe/dev", tags=["stripe-dev"])

# --------- Schemas ---------
class CreateConnectedAccountIn(BaseModel):
    country: constr(min_length=2, max_length=2) = "US"
    business_type: str = "individual"  # or "company"

class CreateConnectedAccountOut(BaseModel):
    account_id: str
    payouts_enabled: bool
    details_submitted: bool

class AttachTestBankIn(BaseModel):
    account_id: str
    routing_number: str = "110000000"      # Stripe test routing
    account_number: str = "000123456789"   # Stripe test account
    currency: str = "usd"
    holder_name: str = "Jenny Rosen"
    holder_type: str = "individual"        # or "company"
    country: str = "US"

class AttachTestBankOut(BaseModel):
    id: str
    object: str
    bank_name: Optional[str] = None
    last4: Optional[str] = None
    status: Optional[str] = None

class FundAccountIn(BaseModel):
    account_id: str
    amount: int = Field(..., gt=0, description="Amount in the smallest currency unit, e.g. cents")
    currency: str = "usd"
    description: Optional[str] = "Dev funding payment"

class PayoutIn(BaseModel):
    account_id: str
    amount: int = Field(..., gt=0, description="Amount in the smallest currency unit")
    currency: str = "usd"
    method: str = "standard"  # 'standard' or 'instant' (instant needs extra setup)

# --------- Endpoints ---------
@router.post("/setup-main-account", dependencies=[Depends(ensure_dev)])
def setup_main_account():
    """
    Dev-only: Set up the main Stripe account for testing payouts.
    This creates external accounts directly on the main account.
    """
    try:
        # Get current account info
        account = stripe.Account.retrieve()
        
        # Create external accounts for testing
        results = []
        
        # Create USD external account
        try:
            usd_token = stripe.Token.create(
                bank_account={
                    "country": "US",
                    "currency": "usd",
                    "account_holder_name": "Test Account",
                    "account_holder_type": "individual",
                    "routing_number": "110000000",
                    "account_number": "000123456789",
                }
            )
            usd_account = stripe.Account.create_external_account(
                account.id,
                external_account=usd_token.id,
            )
            results.append({"currency": "USD", "id": usd_account.id, "status": usd_account.status})
        except Exception as e:
            results.append({"currency": "USD", "error": str(e)})
        
        # Create ZAR external account
        try:
            zar_token = stripe.Token.create(
                bank_account={
                    "country": "ZA",
                    "currency": "zar",
                    "account_holder_name": "Test Account",
                    "account_holder_type": "individual",
                    "routing_number": "051001",
                    "account_number": "1234567890",
                }
            )
            zar_account = stripe.Account.create_external_account(
                account.id,
                external_account=zar_token.id,
            )
            results.append({"currency": "ZAR", "id": zar_account.id, "status": zar_account.status})
        except Exception as e:
            results.append({"currency": "ZAR", "error": str(e)})
        
        return {
            "account_id": account.id,
            "external_accounts": results,
            "message": "Main account setup completed"
        }
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.post("/test-payout", dependencies=[Depends(ensure_dev)])
def test_payout(amount: int = 100, currency: str = "usd"):
    """
    Dev-only: Create a test payout from the main account.
    """
    try:
        payout = stripe.Payout.create(
            amount=amount,
            currency=currency,
            description="Dev test payout"
        )
        return {
            "payout_id": payout.id,
            "status": payout.status,
            "amount": payout.amount,
            "currency": payout.currency
        }
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.get("/test-account", dependencies=[Depends(ensure_dev)])
def test_account():
    """
    Dev-only: Get basic account information (works in test mode).
    """
    try:
        account = stripe.Account.retrieve()
        return {
            "account_id": account.id,
            "country": account.country,
            "type": account.type,
            "payouts_enabled": account.get("payouts_enabled", False),
            "charges_enabled": account.get("charges_enabled", False),
            "details_submitted": account.get("details_submitted", False),
            "connected_account_id": settings.stripe_connected_account_id
        }
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.post("/set-connected-account", dependencies=[Depends(ensure_dev)])
def set_connected_account(account_id: str = Query(..., description="Connected account ID")):
    """
    Dev-only: Set the connected account ID for payouts.
    """
    try:
        # Verify the account exists
        account = stripe.Account.retrieve(account_id)
        
        # Update the settings (this will only work for the current session)
        settings.stripe_connected_account_id = account_id
        
        return {
            "message": f"Connected account set to {account_id}",
            "account_id": account_id,
            "account_type": account.type,
            "country": account.country,
            "payouts_enabled": account.get("payouts_enabled", False)
        }
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.get("/connected-account", dependencies=[Depends(ensure_dev)])
def get_connected_account():
    """
    Dev-only: Get information about the currently set connected account.
    """
    if not settings.stripe_connected_account_id:
        return {"message": "No connected account set", "account_id": None}
    
    try:
        account = stripe.Account.retrieve(settings.stripe_connected_account_id)
        return {
            "account_id": account.id,
            "country": account.country,
            "type": account.type,
            "payouts_enabled": account.get("payouts_enabled", False),
            "charges_enabled": account.get("charges_enabled", False),
            "details_submitted": account.get("details_submitted", False)
        }
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.get("/check-currency-support", dependencies=[Depends(ensure_dev)])
def check_currency_support(currency: str = "usd"):
    """
    Dev-only: Check if a currency is supported by checking external accounts.
    """
    try:
        from app.services.stripe_payouts import ensure_external_account_currency

        # Use connected account if available, otherwise main account
        if settings.stripe_connected_account_id:
            account_id = settings.stripe_connected_account_id
        else:
            account = stripe.Account.retrieve()
            account_id = account.id

        is_supported = ensure_external_account_currency(account_id, currency)

        return {
            "account_id": account_id,
            "currency": currency.upper(),
            "is_supported": is_supported,
            "message": f"Currency {currency.upper()} is {'supported' if is_supported else 'NOT supported'}",
            "account_type": "connected" if settings.stripe_connected_account_id else "main"
        }
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.get("/main-account-info", dependencies=[Depends(ensure_dev)])
def get_main_account_info():
    """
    Dev-only: Get main account information and external accounts.
    """
    try:
        account = stripe.Account.retrieve()
        external_accounts = stripe.Account.list_external_accounts(account.id)
        
        return {
            "account_id": account.id,
            "country": account.country,
            "payouts_enabled": account.get("payouts_enabled", False),
            "external_accounts": [
                {
                    "id": acc.id,
                    "currency": acc.currency,
                    "status": acc.status,
                    "bank_name": acc.get("bank_name"),
                    "last4": acc.get("last4")
                }
                for acc in external_accounts.data
            ]
        }
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")
@router.post("/create-connected-account", response_model=CreateConnectedAccountOut, dependencies=[Depends(ensure_dev)])
def create_connected_account(payload: CreateConnectedAccountIn):
    """
    Dev-only: Create an Express connected account and put payout schedule on manual.
    Note: Requires Stripe Connect to be enabled on your account.
    """
    try:
        acct = stripe.Account.create(
            type="express",
            country=payload.country,
            business_type=payload.business_type,
            capabilities={
                "transfers": {"requested": True},
                "card_payments": {"requested": True},
            },
            business_profile={"product_description": "Dev test connected account"},
        )
        # Put payouts on manual so we trigger them ourselves
        stripe.Account.modify(
            acct.id,
            settings={"payouts": {"schedule": {"interval": "manual"}}}
        )
        # Return a simple shape
        return CreateConnectedAccountOut(
            account_id=acct.id,
            payouts_enabled=acct.get("payouts_enabled", False),
            details_submitted=acct.get("details_submitted", False),
        )
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.post("/attach-test-bank", response_model=AttachTestBankOut, dependencies=[Depends(ensure_dev)])
def attach_test_bank(payload: AttachTestBankIn):
    """
    Dev-only: Attach a test bank account to a connected account using tokenization.
    """
    try:
        token = stripe.Token.create(
            bank_account={
                "country": payload.country,
                "currency": payload.currency,
                "account_holder_name": payload.holder_name,
                "account_holder_type": payload.holder_type,
                "routing_number": payload.routing_number,
                "account_number": payload.account_number,
            }
        )
        ext = stripe.Account.create_external_account(
            payload.account_id,
            external_account=token.id,
        )
        return AttachTestBankOut(
            id=ext["id"],
            object=ext["object"],
            bank_name=ext.get("bank_name"),
            last4=ext.get("last4"),
            status=ext.get("status"),
        )
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.post("/fund", dependencies=[Depends(ensure_dev)])
def fund_connected_account(payload: FundAccountIn):
    """
    Dev-only: Create a PaymentIntent on the PLATFORM with transfer_data.destination
    to send test funds to the connected account. Uses tok_visa via a PaymentMethod.
    """
    try:
        # Create a test card PaymentMethod via token
        pm = stripe.PaymentMethod.create(
            type="card",
            card={"token": "tok_visa"}
        )
        pi = stripe.PaymentIntent.create(
            amount=payload.amount,
            currency=payload.currency,
            confirm=True,
            payment_method=pm.id,
            # Destination charges pattern (funds to connected account):
            transfer_data={"destination": payload.account_id},
            description=payload.description or "Dev funding payment",
            # In test, no customer needed — keep it simple
            automatic_payment_methods={"enabled": False},
        )
        return {"payment_intent_id": pi.id, "status": pi.status}
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.post("/payout", dependencies=[Depends(ensure_dev)])
def create_payout(payload: PayoutIn):
    """
    Dev-only: Create a payout from the CONNECTED ACCOUNT balance to its external bank.
    """
    try:
        p = stripe.Payout.create(
            amount=payload.amount,
            currency=payload.currency,
            method=payload.method,
            stripe_account=payload.account_id,  # Scope to connected account
        )
        return {"payout_id": p.id, "status": p.status}
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.get("/external-accounts", dependencies=[Depends(ensure_dev)])
def list_external_accounts(account_id: str = Query(..., description="Connected account id (acct_...)")):
    """
    Dev-only: List bank external accounts on the connected account.
    """
    try:
        ext = stripe.Account.list_external_accounts(
            account_id,
            object="bank_account"
        )
        return ext
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")

@router.get("/balance", dependencies=[Depends(ensure_dev)])
def get_balance(account_id: str = Query(..., description="Connected account id (acct_...)")):
    """
    Dev-only: Retrieve the connected account balance.
    """
    try:
        bal = stripe.Balance.retrieve(stripe_account=account_id)
        return bal
    except Exception as e:
        raise HTTPException(400, f"Stripe error: {e}")
