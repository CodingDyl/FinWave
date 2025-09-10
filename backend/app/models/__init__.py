# app/models/__init__.py
from app.db.base import Base  # declarative Base
# Import models so they register with Base.metadata
from app.models.user import User
from app.models.payout import PayoutRequest
from app.models.webhook_event import WebhookEvent  # if you have it

__all__ = ["Base", "User", "PayoutRequest", "WebhookEvent"]
