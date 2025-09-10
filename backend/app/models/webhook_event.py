from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy.types import DateTime
from app.db.base import Base

class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(50), index=True)
    signature_header: Mapped[str] = mapped_column(String(512))
    valid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    received_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
