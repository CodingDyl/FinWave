"""
Comprehensive logging service for the Finwave application.
Provides structured logging with correlation IDs, user context, and business event tracking.
"""

import uuid
import time
from typing import Any, Dict, Optional, Union
from enum import Enum
import structlog
from sqlalchemy.orm import Session
from app.core.errors import log_error, FinwaveError
from app.models.user import User

logger = structlog.get_logger(__name__)

class LogLevel(str, Enum):
    """Standardized log levels."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class BusinessEvent(str, Enum):
    """Business events that should be logged for audit and analytics."""
    # User Events
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_REGISTRATION = "user_registration"
    USER_PROFILE_UPDATE = "user_profile_update"
    
    # Beneficiary Events
    BENEFICIARY_CREATED = "beneficiary_created"
    BENEFICIARY_UPDATED = "beneficiary_updated"
    BENEFICIARY_DELETED = "beneficiary_deleted"
    BENEFICIARY_VIEWED = "beneficiary_viewed"
    
    # Destination Events
    DESTINATION_CREATED = "destination_created"
    DESTINATION_UPDATED = "destination_updated"
    DESTINATION_DELETED = "destination_deleted"
    DESTINATION_VERIFIED = "destination_verified"
    
    # Payout Events
    PAYOUT_CREATED = "payout_created"
    PAYOUT_PROCESSED = "payout_processed"
    PAYOUT_CANCELLED = "payout_cancelled"
    PAYOUT_FAILED = "payout_failed"
    PAYOUT_COMPLETED = "payout_completed"
    PAYOUT_VIEWED = "payout_viewed"
    
    # Connected Account Events
    CONNECTED_ACCOUNT_CREATED = "connected_account_created"
    CONNECTED_ACCOUNT_UPDATED = "connected_account_updated"
    CONNECTED_ACCOUNT_LINKED = "connected_account_linked"
    BANK_ACCOUNT_ADDED = "bank_account_added"
    BANK_ACCOUNT_VERIFIED = "bank_account_verified"
    
    # Stripe Events
    STRIPE_WEBHOOK_RECEIVED = "stripe_webhook_received"
    STRIPE_WEBHOOK_PROCESSED = "stripe_webhook_processed"
    STRIPE_WEBHOOK_FAILED = "stripe_webhook_failed"
    STRIPE_PAYOUT_CREATED = "stripe_payout_created"
    STRIPE_PAYOUT_UPDATED = "stripe_payout_updated"
    
    # System Events
    API_REQUEST = "api_request"
    API_RESPONSE = "api_response"
    DATABASE_QUERY = "database_query"
    EXTERNAL_API_CALL = "external_api_call"
    CACHE_HIT = "cache_hit"
    CACHE_MISS = "cache_miss"

class LoggingService:
    """Centralized logging service for structured logging across the application."""
    
    @staticmethod
    def log_business_event(
        event: BusinessEvent,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        level: LogLevel = LogLevel.INFO
    ) -> None:
        """Log a business event with structured data."""
        
        log_data = {
            "event_type": event.value,
            "timestamp": time.time(),
        }
        
        if user_id:
            log_data["user_id"] = user_id
        
        if resource_id:
            log_data["resource_id"] = resource_id
        
        if details:
            log_data.update(details)
        
        # Use the appropriate log level
        log_method = getattr(logger, level.value, logger.info)
        log_method(f"Business event: {event.value}", **log_data)
    
    @staticmethod
    def log_api_request(
        method: str,
        path: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Log an API request with context."""
        
        log_data = {
            "method": method,
            "path": path,
            "timestamp": time.time(),
        }
        
        if user_id:
            log_data["user_id"] = user_id
        
        if request_id:
            log_data["request_id"] = request_id
        
        if payload:
            # Sanitize sensitive data
            sanitized_payload = LoggingService._sanitize_payload(payload)
            log_data["payload"] = sanitized_payload
        
        if headers:
            # Sanitize sensitive headers
            sanitized_headers = LoggingService._sanitize_headers(headers)
            log_data["headers"] = sanitized_headers
        
        logger.info("API request received", **log_data)
    
    @staticmethod
    def log_api_response(
        method: str,
        path: str,
        status_code: int,
        response_time_ms: float,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        error: Optional[Exception] = None
    ) -> None:
        """Log an API response with performance metrics."""
        
        log_data = {
            "method": method,
            "path": path,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "timestamp": time.time(),
        }
        
        if user_id:
            log_data["user_id"] = user_id
        
        if request_id:
            log_data["request_id"] = request_id
        
        if error:
            log_data["error"] = str(error)
            log_data["error_type"] = type(error).__name__
        
        # Determine log level based on status code
        if status_code >= 500:
            level = LogLevel.ERROR
        elif status_code >= 400:
            level = LogLevel.WARNING
        else:
            level = LogLevel.INFO
        
        log_method = getattr(logger, level.value, logger.info)
        log_method("API response sent", **log_data)
    
    @staticmethod
    def log_database_operation(
        operation: str,
        table: str,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        query_time_ms: Optional[float] = None,
        rows_affected: Optional[int] = None,
        error: Optional[Exception] = None
    ) -> None:
        """Log a database operation with performance metrics."""
        
        log_data = {
            "operation": operation,
            "table": table,
            "timestamp": time.time(),
        }
        
        if user_id:
            log_data["user_id"] = user_id
        
        if resource_id:
            log_data["resource_id"] = resource_id
        
        if query_time_ms is not None:
            log_data["query_time_ms"] = query_time_ms
        
        if rows_affected is not None:
            log_data["rows_affected"] = rows_affected
        
        if error:
            log_data["error"] = str(error)
            log_data["error_type"] = type(error).__name__
            logger.error("Database operation failed", **log_data)
        else:
            logger.debug("Database operation completed", **log_data)
    
    @staticmethod
    def log_external_api_call(
        service: str,
        endpoint: str,
        method: str,
        status_code: Optional[int] = None,
        response_time_ms: Optional[float] = None,
        user_id: Optional[str] = None,
        error: Optional[Exception] = None
    ) -> None:
        """Log an external API call with performance metrics."""
        
        log_data = {
            "service": service,
            "endpoint": endpoint,
            "method": method,
            "timestamp": time.time(),
        }
        
        if status_code:
            log_data["status_code"] = status_code
        
        if response_time_ms is not None:
            log_data["response_time_ms"] = response_time_ms
        
        if user_id:
            log_data["user_id"] = user_id
        
        if error:
            log_data["error"] = str(error)
            log_data["error_type"] = type(error).__name__
            logger.error("External API call failed", **log_data)
        else:
            logger.info("External API call completed", **log_data)
    
    @staticmethod
    def log_security_event(
        event: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a security-related event."""
        
        log_data = {
            "security_event": event,
            "timestamp": time.time(),
        }
        
        if user_id:
            log_data["user_id"] = user_id
        
        if ip_address:
            log_data["ip_address"] = ip_address
        
        if user_agent:
            log_data["user_agent"] = user_agent
        
        if details:
            log_data.update(details)
        
        logger.warning("Security event detected", **log_data)
    
    @staticmethod
    def log_performance_metric(
        metric_name: str,
        value: Union[int, float],
        unit: str = "ms",
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a performance metric."""
        
        log_data = {
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
            "timestamp": time.time(),
        }
        
        if user_id:
            log_data["user_id"] = user_id
        
        if details:
            log_data.update(details)
        
        logger.info("Performance metric", **log_data)
    
    @staticmethod
    def _sanitize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize payload data to remove sensitive information."""
        
        sensitive_fields = {
            'password', 'secret', 'token', 'key', 'ssn', 'credit_card',
            'card_number', 'cvv', 'routing_number', 'account_number',
            'iban', 'bic', 'api_key', 'private_key'
        }
        
        def sanitize_value(key: str, value: Any) -> Any:
            if isinstance(value, dict):
                return {k: sanitize_value(k, v) for k, v in value.items()}
            elif isinstance(value, list):
                return [sanitize_value(key, item) for item in value]
            elif key.lower() in sensitive_fields:
                return "***REDACTED***"
            else:
                return value
        
        return {k: sanitize_value(k, v) for k, v in payload.items()}
    
    @staticmethod
    def _sanitize_headers(headers: Dict[str, str]) -> Dict[str, str]:
        """Sanitize headers to remove sensitive information."""
        
        sensitive_headers = {
            'authorization', 'cookie', 'x-api-key', 'x-auth-token',
            'x-stripe-signature', 'stripe-signature'
        }
        
        return {
            k: "***REDACTED***" if k.lower() in sensitive_headers else v
            for k, v in headers.items()
        }

# Convenience functions for common logging patterns
def log_user_action(
    action: str,
    user_id: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """Log a user action with context."""
    
    log_data = {
        "action": action,
        "user_id": user_id,
        "timestamp": time.time(),
    }
    
    if resource_type:
        log_data["resource_type"] = resource_type
    
    if resource_id:
        log_data["resource_id"] = resource_id
    
    if details:
        log_data.update(details)
    
    logger.info("User action performed", **log_data)

def log_error_with_context(
    error: Exception,
    context: Dict[str, Any],
    user_id: Optional[str] = None
) -> None:
    """Log an error with additional context."""
    
    log_error(error, context, user_id)

def log_idempotency_event(
    key: str,
    action: str,
    existing_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> None:
    """Log an idempotency-related event."""
    
    log_data = {
        "idempotency_key": key,
        "action": action,
        "timestamp": time.time(),
    }
    
    if existing_id:
        log_data["existing_id"] = existing_id
    
    if user_id:
        log_data["user_id"] = user_id
    
    logger.info("Idempotency event", **log_data)
