import enum, uuid
from sqlalchemy import String, Integer, Enum, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.db.base import Base

class PayoutStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"
    CANCELED = "CANCELED"

class PayoutRequest(Base):
    __tablename__ = "payout_requests"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_payout_user_idempotency"),
    )

    # cross-DB friendly UUID-as-string
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    beneficiary_id: Mapped[str] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True, nullable=False)
    destination_id: Mapped[str] = mapped_column(ForeignKey("payout_destinations.id", ondelete="CASCADE"), index=True, nullable=False)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # minor units
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)

    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[PayoutStatus] = mapped_column(Enum(PayoutStatus), default=PayoutStatus.PENDING, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    failure_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Stripe-specific fields
    stripe_payout_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_balance_transaction: Mapped[str | None] = mapped_column(String(255), nullable=True)
    arrival_date: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    beneficiary: Mapped["Beneficiary"] = relationship("Beneficiary", back_populates="payouts")
    destination: Mapped["PayoutDestination"] = relationship("PayoutDestination", back_populates="payouts")
