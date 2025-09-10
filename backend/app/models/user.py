from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    oauth_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # sha256 hex
