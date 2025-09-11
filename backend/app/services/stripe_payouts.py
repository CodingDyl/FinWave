import logging
import stripe
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.payout import PayoutRequest, PayoutStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

def ensure_external_account_currency(acct_id: str, currency: str) -> bool:
    """
    Verify that the connected account has an external bank in the desired currency.
    
    Args:
        acct_id: Stripe account ID (connected account)
        currency: Currency code (e.g., 'usd', 'zar')
    
    Returns:
        True if external account exists in the currency, False otherwise
    """
    try:
        banks = stripe.Account.list_external_accounts(
            acct_id, object="bank_account", limit=100
        )
        return any((ba.get("currency") or "").lower() == currency.lower() for ba in banks.auto_paging_iter())
    except Exception as e:
        logger.error(f"Error checking external accounts for {acct_id}: {e}")
        return False

class StripePayoutService:
    """Service for handling Stripe payout operations"""
    
    @staticmethod
    def create_payout(payout_request: PayoutRequest, destination: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a payout in Stripe using the connected account or main account
        This simulates a real-world payout process
        """
        try:
            # Determine which account to use for payouts
            # For now, always use the connected account for payouts
            connected_account_id = "acct_1S6GC5K3YPv8GzMh"  # Your connected account
            
            if connected_account_id:
                # Use connected account for payouts
                account_id = connected_account_id
                logger.info(f"Using connected account for payout: {account_id}")
            else:
                # Fall back to main account
                account = stripe.Account.retrieve()
                account_id = account.id
                logger.info(f"Using main account for payout: {account_id}")
            
            # Verify external account exists for the currency
            if not ensure_external_account_currency(account_id, payout_request.currency):
                raise ValueError(
                    f"No external account in {payout_request.currency.upper()} on {account_id}. "
                    f"Attach a bank in that currency or change the payout currency."
                )
            
            # Convert amount from minor units to major units for Stripe
            amount = payout_request.amount / 100
            
            # Create Stripe payout
            payout_params = {
                "amount": int(amount * 100),  # Stripe expects amount in cents
                "currency": payout_request.currency.lower(),
                "description": f"Payout to {payout_request.beneficiary.name}",
                "metadata": {
                    "payout_request_id": payout_request.id,
                    "beneficiary_id": payout_request.beneficiary_id,
                    "destination_id": payout_request.destination_id,
                    "memo": payout_request.memo or "",
                }
            }
            
            # If using connected account, add stripe_account parameter
            if connected_account_id:
                stripe_payout = stripe.Payout.create(
                    **payout_params,
                    stripe_account=connected_account_id
                )
            else:
                stripe_payout = stripe.Payout.create(**payout_params)
            
            logger.info(f"Created Stripe payout {stripe_payout.id} for payout request {payout_request.id}")
            
            return {
                "stripe_payout_id": stripe_payout.id,
                "status": stripe_payout.status,
                "arrival_date": stripe_payout.arrival_date,
                "failure_code": stripe_payout.failure_code,
                "failure_message": stripe_payout.failure_message,
                "balance_transaction": stripe_payout.balance_transaction,
            }
            
        except stripe.error.InvalidRequestError as e:
            if "external accounts" in str(e).lower():
                logger.error(f"Stripe currency error: {e}")
                raise Exception(f"Currency not supported: {payout_request.currency.upper()}. Please use USD, EUR, or GBP for testing, or set up external accounts for {payout_request.currency.upper()} in your Stripe dashboard.")
            else:
                logger.error(f"Stripe invalid request error: {e}")
                raise Exception(f"Stripe payout creation failed: {str(e)}")
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payout: {e}")
            raise Exception(f"Stripe payout creation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error creating Stripe payout: {e}")
            raise Exception(f"Payout creation failed: {str(e)}")
    
    @staticmethod
    def cancel_payout(stripe_payout_id: str) -> Dict[str, Any]:
        """
        Cancel a pending payout in Stripe
        """
        try:
            stripe_payout = stripe.Payout.cancel(stripe_payout_id)
            
            logger.info(f"Cancelled Stripe payout {stripe_payout_id}")
            
            return {
                "stripe_payout_id": stripe_payout.id,
                "status": stripe_payout.status,
                "cancelled": True,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling payout: {e}")
            raise Exception(f"Stripe payout cancellation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error cancelling Stripe payout: {e}")
            raise Exception(f"Payout cancellation failed: {str(e)}")
    
    @staticmethod
    def get_payout_status(stripe_payout_id: str) -> Dict[str, Any]:
        """
        Get the current status of a Stripe payout
        """
        try:
            stripe_payout = stripe.Payout.retrieve(stripe_payout_id)
            
            return {
                "stripe_payout_id": stripe_payout.id,
                "status": stripe_payout.status,
                "arrival_date": stripe_payout.arrival_date,
                "failure_code": stripe_payout.failure_code,
                "failure_message": stripe_payout.failure_message,
                "balance_transaction": stripe_payout.balance_transaction,
                "created": stripe_payout.created,
                "description": stripe_payout.description,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving payout: {e}")
            raise Exception(f"Stripe payout retrieval failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error retrieving Stripe payout: {e}")
            raise Exception(f"Payout retrieval failed: {str(e)}")
    
    @staticmethod
    def process_payout_request(db: Session, payout_request: PayoutRequest) -> PayoutRequest:
        """
        Process a payout request by creating it in Stripe and updating the database
        """
        try:
            # Get destination details
            destination = {
                "type": payout_request.destination.type.value,
                "label": payout_request.destination.label,
                "currency": payout_request.destination.currency,
                "country": payout_request.destination.country,
            }
            
            # Create payout in Stripe
            stripe_result = StripePayoutService.create_payout(payout_request, destination)
            
            # Update payout request with Stripe details
            payout_request.external_id = stripe_result["stripe_payout_id"]
            payout_request.status = PayoutStatus.PROCESSING
            
            # Update failure details if any
            if stripe_result.get("failure_code"):
                payout_request.failure_code = stripe_result["failure_code"]
                payout_request.failure_message = stripe_result["failure_message"]
                payout_request.status = PayoutStatus.FAILED
            
            db.commit()
            db.refresh(payout_request)
            
            logger.info(f"Successfully processed payout request {payout_request.id}")
            return payout_request
            
        except Exception as e:
            logger.error(f"Error processing payout request {payout_request.id}: {e}")
            # Update payout request with failure status
            payout_request.status = PayoutStatus.FAILED
            payout_request.failure_message = str(e)
            db.commit()
            db.refresh(payout_request)
            raise e
    
    @staticmethod
    def cancel_payout_request(db: Session, payout_request: PayoutRequest) -> PayoutRequest:
        """
        Cancel a payout request by cancelling it in Stripe and updating the database
        """
        try:
            if not payout_request.external_id:
                raise Exception("No external ID found for payout request")
            
            # Cancel payout in Stripe
            stripe_result = StripePayoutService.cancel_payout(payout_request.external_id)
            
            # Update payout request status
            payout_request.status = PayoutStatus.CANCELED
            db.commit()
            db.refresh(payout_request)
            
            logger.info(f"Successfully cancelled payout request {payout_request.id}")
            return payout_request
            
        except Exception as e:
            logger.error(f"Error cancelling payout request {payout_request.id}: {e}")
            raise e
    
    @staticmethod
    def update_payout_from_webhook(db: Session, stripe_payout_id: str, webhook_data: Dict[str, Any]) -> Optional[PayoutRequest]:
        """
        Update payout request based on Stripe webhook data
        """
        try:
            # Find payout request by external_id
            payout_request = db.query(PayoutRequest).filter(
                PayoutRequest.external_id == stripe_payout_id
            ).first()
            
            if not payout_request:
                logger.warning(f"No payout request found for Stripe payout {stripe_payout_id}")
                return None
            
            # Update status based on webhook data
            stripe_status = webhook_data.get("status", "")
            
            if stripe_status == "paid":
                payout_request.status = PayoutStatus.PAID
            elif stripe_status == "failed":
                payout_request.status = PayoutStatus.FAILED
                payout_request.failure_code = webhook_data.get("failure_code")
                payout_request.failure_message = webhook_data.get("failure_message")
            elif stripe_status == "canceled":
                payout_request.status = PayoutStatus.CANCELED
            
            db.commit()
            db.refresh(payout_request)
            
            logger.info(f"Updated payout request {payout_request.id} from webhook: {stripe_status}")
            return payout_request
            
        except Exception as e:
            logger.error(f"Error updating payout from webhook: {e}")
            raise e
