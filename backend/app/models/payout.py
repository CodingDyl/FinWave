import enum, uuid
from sqlalchemy import String, Integer, Enum, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.db.base import Base

class PayoutStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"

class PayoutRequest(Base):
    __tablename__ = "payout_requests"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_payout_user_idempotency"),
    )

    # cross-DB friendly UUID-as-string
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # minor units
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    destination_json: Mapped[dict] = mapped_column("destination", JSON, nullable=False)

    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[PayoutStatus] = mapped_column(Enum(PayoutStatus), default=PayoutStatus.PENDING, nullable=False)

    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
