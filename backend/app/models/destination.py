import enum
import uuid
from sqlalchemy import String, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.db.base import Base


class DestinationType(str, enum.Enum):
    BANK_ACCOUNT = "bank_account"
    CARD = "card"


class DestinationStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    VERIFIED = "verified"


class PayoutDestination(Base):
    __tablename__ = "payout_destinations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    beneficiary_id: Mapped[str] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True, nullable=False)
    
    type: Mapped[DestinationType] = mapped_column(Enum(DestinationType), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    last4: Mapped[str | None] = mapped_column(String(4), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)  # ISO country code
    status: Mapped[DestinationStatus] = mapped_column(Enum(DestinationStatus), default=DestinationStatus.UNVERIFIED, nullable=False)
    external_token: Mapped[str | None] = mapped_column(String(255), nullable=True)  # For production tokenization
    
    # Bank account details
    account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    routing_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)  # IBAN can be up to 34 characters
    bic: Mapped[str | None] = mapped_column(String(11), nullable=True)  # BIC/SWIFT code
    
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    beneficiary: Mapped["Beneficiary"] = relationship("Beneficiary", back_populates="destinations")
    payouts: Mapped[list["PayoutRequest"]] = relationship("PayoutRequest", back_populates="destination")
