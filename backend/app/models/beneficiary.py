import enum
import uuid
from sqlalchemy import String, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.db.base import Base


class BeneficiaryType(str, enum.Enum):
    INDIVIDUAL = "individual"
    BUSINESS = "business"


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    
    type: Mapped[BeneficiaryType] = mapped_column(Enum(BeneficiaryType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # sha256 hex
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)  # ISO country code
    
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    destinations: Mapped[list["PayoutDestination"]] = relationship("PayoutDestination", back_populates="beneficiary", cascade="all, delete-orphan")
    payouts: Mapped[list["PayoutRequest"]] = relationship("PayoutRequest", back_populates="beneficiary")
