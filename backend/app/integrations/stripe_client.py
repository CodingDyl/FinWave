import stripe
from app.core.config import settings

# Initialize Stripe once on import
stripe.api_key = settings.stripe_secret_key

__all__ = ["stripe"]