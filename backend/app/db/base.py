from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

# Import all models here so Alembic can discover them
from app.models.user import User
from app.models.beneficiary import Beneficiary
from app.models.destination import PayoutDestination
from app.models.payout import PayoutRequest
from app.models.idempotency import IdempotencyKey