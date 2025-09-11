"""
Idempotency service for ensuring safe retry of operations.
Provides idempotency key management and duplicate request detection.
"""

import hashlib
import json
import time
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
import structlog

from app.models.idempotency import IdempotencyKey
from app.core.errors import IdempotencyError, log_error

logger = structlog.get_logger(__name__)

class IdempotencyService:
    """Service for managing idempotency keys and preventing duplicate operations."""
    
    @staticmethod
    def generate_key(
        user_id: str,
        operation: str,
        payload: Dict[str, Any],
        custom_key: Optional[str] = None
    ) -> str:
        """
        Generate an idempotency key for an operation.
        
        Args:
            user_id: ID of the user performing the operation
            operation: Type of operation (e.g., 'create_payout', 'update_beneficiary')
            payload: Request payload to include in key generation
            custom_key: Custom key provided by client (optional)
        
        Returns:
            Generated idempotency key
        """
        if custom_key:
            return f"{user_id}:{operation}:{custom_key}"
        
        # Create a hash of the payload for deterministic key generation
        payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()[:16]
        
        return f"{user_id}:{operation}:{payload_hash}"
    
    @staticmethod
    def check_key(
        db: Session,
        key: str,
        user_id: str,
        operation: str
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Check if an idempotency key already exists and return the result.
        
        Args:
            db: Database session
            key: Idempotency key to check
            user_id: ID of the user
            operation: Type of operation
            payload: Request payload
        
        Returns:
            Tuple of (exists, result_data)
        """
        try:
            # Look up the key in the database
            stmt = select(IdempotencyKey).where(
                and_(
                    IdempotencyKey.key == key,
                    IdempotencyKey.user_id == user_id,
                    IdempotencyKey.operation == operation
                )
            )
            
            existing_key = db.execute(stmt).scalar_one_or_none()
            
            if existing_key:
                # Key exists, return the stored result
                return True, existing_key.result_data
            
            return False, None
            
        except Exception as e:
            log_error(e, {
                "operation": "check_idempotency_key",
                "key": key,
                "user_id": user_id,
                "operation_type": operation
            })
            raise
    
    @staticmethod
    def store_key(
        db: Session,
        key: str,
        user_id: str,
        operation: str,
        result_data: Dict[str, Any],
        expires_at: Optional[float] = None
    ) -> None:
        """
        Store an idempotency key with its result.
        
        Args:
            db: Database session
            key: Idempotency key
            user_id: ID of the user
            operation: Type of operation
            result_data: Result data to store
            expires_at: Expiration timestamp (optional)
        """
        try:
            # Set default expiration (24 hours from now)
            if expires_at is None:
                expires_at = time.time() + (24 * 60 * 60)
            
            # Create new idempotency key record
            idempotency_key = IdempotencyKey(
                key=key,
                user_id=user_id,
                operation=operation,
                result_data=result_data,
                expires_at=expires_at
            )
            
            db.add(idempotency_key)
            db.commit()
            
            logger.info("Idempotency key stored", 
                key=key, 
                user_id=user_id, 
                operation=operation
            )
            
        except Exception as e:
            db.rollback()
            log_error(e, {
                "operation": "store_idempotency_key",
                "key": key,
                "user_id": user_id,
                "operation_type": operation
            })
            raise
    
    @staticmethod
    def execute_with_idempotency(
        db: Session,
        key: str,
        user_id: str,
        operation: str,
        payload: Dict[str, Any],
        operation_func: callable,
        expires_at: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Execute an operation with idempotency protection.
        
        Args:
            db: Database session
            key: Idempotency key
            user_id: ID of the user
            operation: Type of operation
            payload: Request payload
            operation_func: Function to execute if key doesn't exist
            expires_at: Expiration timestamp (optional)
        
        Returns:
            Result of the operation (either from cache or execution)
        """
        try:
            # Check if key already exists
            exists, cached_result = IdempotencyService.check_key(
                db, key, user_id, operation
            )
            
            if exists:
                # Key exists, return cached result
                logger.info("Idempotency key hit", 
                    key=key, 
                    user_id=user_id, 
                    operation=operation
                )
                return cached_result
            
            # Key doesn't exist, execute the operation
            logger.info("Executing operation with idempotency", 
                key=key, 
                user_id=user_id, 
                operation=operation
            )
            
            # Execute the operation
            result = operation_func()
            
            # Store the result with the key
            IdempotencyService.store_key(
                db, key, user_id, operation, result, expires_at
            )
            
            return result
            
        except Exception as e:
            log_error(e, {
                "operation": "execute_with_idempotency",
                "key": key,
                "user_id": user_id,
                "operation_type": operation
            })
            raise
    
    @staticmethod
    def validate_key_format(key: str) -> bool:
        """
        Validate that an idempotency key has a reasonable format.
        
        Args:
            key: Idempotency key to validate
        
        Returns:
            True if valid, False otherwise
        """
        if not key or not isinstance(key, str):
            return False
        
        # Check minimum length (at least 8 characters)
        if len(key) < 8:
            return False
        
        # Check maximum length (reasonable limit)
        if len(key) > 255:
            return False
        
        # Check for reasonable characters (alphanumeric, hyphens, underscores, colons)
        import re
        if not re.match(r'^[a-zA-Z0-9\-_:]+$', key):
            return False
        
        # If it's in the format user_id:operation:hash, validate the parts
        parts = key.split(':')
        if len(parts) == 3:
            user_id, operation, hash_or_custom = parts
            
            # Validate user_id (should not be empty)
            if not user_id or len(user_id) < 1:
                return False
            
            # Validate operation (should be alphanumeric with underscores)
            if not operation or not operation.replace('_', '').isalnum():
                return False
            
            # Validate hash_or_custom (should not be empty)
            if not hash_or_custom or len(hash_or_custom) < 1:
                return False
        
        # For simple UUIDs or other formats, just check they're reasonable
        return True
    
    @staticmethod
    def cleanup_expired_keys(db: Session) -> int:
        """
        Clean up expired idempotency keys.
        
        Args:
            db: Database session
        
        Returns:
            Number of keys cleaned up
        """
        try:
            current_time = time.time()
            
            # Delete expired keys
            stmt = select(IdempotencyKey).where(
                IdempotencyKey.expires_at < current_time
            )
            
            expired_keys = db.execute(stmt).scalars().all()
            count = len(expired_keys)
            
            for key in expired_keys:
                db.delete(key)
            
            db.commit()
            
            if count > 0:
                logger.info("Cleaned up expired idempotency keys", count=count)
            
            return count
            
        except Exception as e:
            db.rollback()
            log_error(e, {"operation": "cleanup_expired_keys"})
            raise
    
    @staticmethod
    def get_user_keys(
        db: Session,
        user_id: str,
        operation: Optional[str] = None,
        limit: int = 100
    ) -> list[IdempotencyKey]:
        """
        Get idempotency keys for a user.
        
        Args:
            db: Database session
            user_id: ID of the user
            operation: Filter by operation type (optional)
            limit: Maximum number of keys to return
        
        Returns:
            List of idempotency keys
        """
        try:
            stmt = select(IdempotencyKey).where(
                IdempotencyKey.user_id == user_id
            )
            
            if operation:
                stmt = stmt.where(IdempotencyKey.operation == operation)
            
            stmt = stmt.order_by(IdempotencyKey.created_at.desc()).limit(limit)
            
            return list(db.execute(stmt).scalars().all())
            
        except Exception as e:
            log_error(e, {
                "operation": "get_user_keys",
                "user_id": user_id,
                "operation_type": operation
            })
            raise

def require_idempotency(
    operation: str,
    expires_hours: int = 24
):
    """
    Decorator to add idempotency protection to an endpoint.
    
    Args:
        operation: Type of operation for idempotency key
        expires_hours: Hours until the key expires
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract required parameters
            db = None
            user_id = None
            request = None
            payload = {}
            
            for arg in args:
                if isinstance(arg, Session):
                    db = arg
                elif hasattr(arg, 'session') and hasattr(arg.session, 'get'):
                    request = arg
                    user_id = str(request.session.get("uid", ""))
                elif isinstance(arg, dict):
                    payload = arg
            
            # Extract from kwargs
            if not db:
                db = kwargs.get('db')
            if not user_id:
                user_id = kwargs.get('user_id')
            if not request:
                request = kwargs.get('request')
            if not payload:
                payload = kwargs.get('payload', {})
            
            # Get idempotency key from request headers
            idempotency_key = None
            if request and hasattr(request, 'headers'):
                idempotency_key = request.headers.get('Idempotency-Key')
            
            if not idempotency_key:
                # Generate a key based on the payload
                idempotency_key = IdempotencyService.generate_key(
                    user_id, operation, payload
                )
            
            # Validate key format
            if not IdempotencyService.validate_key_format(idempotency_key):
                raise IdempotencyError("Invalid idempotency key format")
            
            # Execute with idempotency protection
            expires_at = time.time() + (expires_hours * 60 * 60)
            
            def operation_func():
                return func(*args, **kwargs)
            
            return IdempotencyService.execute_with_idempotency(
                db, idempotency_key, user_id, operation, payload, operation_func, expires_at
            )
        
        return wrapper
    return decorator
