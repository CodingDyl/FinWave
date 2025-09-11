"""
Idempotency key model for tracking duplicate requests and their results.
"""

from sqlalchemy import Column, String, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import time

class IdempotencyKey(Base):
    """Model for storing idempotency keys and their results."""
    
    __tablename__ = "idempotency_keys"
    
    # Primary key
    key = Column(String(255), primary_key=True, comment="Idempotency key")
    
    # User and operation context
    user_id = Column(String(255), nullable=False, comment="User who made the request")
    operation = Column(String(100), nullable=False, comment="Type of operation")
    
    # Result data
    result_data = Column(JSONB, nullable=False, comment="Cached result data")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, comment="When this key expires")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_idempotency_user_operation', 'user_id', 'operation'),
        Index('idx_idempotency_expires', 'expires_at'),
        Index('idx_idempotency_user_created', 'user_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<IdempotencyKey(key='{self.key}', user_id='{self.user_id}', operation='{self.operation}')>"
    
    @property
    def is_expired(self) -> bool:
        """Check if this idempotency key has expired."""
        return time.time() > self.expires_at.timestamp()
    
    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            'key': self.key,
            'user_id': self.user_id,
            'operation': self.operation,
            'result_data': self.result_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired
        }
