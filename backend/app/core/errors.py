"""
Centralized error handling and logging utilities for the Finwave application.
Provides structured error responses with proper logging and user-friendly messages.
"""

import logging
import traceback
from typing import Any, Dict, Optional, Union
from enum import Enum
from fastapi import HTTPException, status
from pydantic import BaseModel
import structlog

logger = structlog.get_logger(__name__)

class ErrorCode(str, Enum):
    """Standardized error codes for consistent error handling."""
    # Authentication & Authorization
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    
    # Validation Errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    
    # Business Logic Errors
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
    
    # Payout Specific Errors
    PAYOUT_NOT_FOUND = "PAYOUT_NOT_FOUND"
    PAYOUT_ALREADY_PROCESSED = "PAYOUT_ALREADY_PROCESSED"
    PAYOUT_CANNOT_BE_CANCELLED = "PAYOUT_CANNOT_BE_CANCELLED"
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
    INVALID_CURRENCY = "INVALID_CURRENCY"
    EXTERNAL_ACCOUNT_NOT_FOUND = "EXTERNAL_ACCOUNT_NOT_FOUND"
    
    # Stripe Integration Errors
    STRIPE_ERROR = "STRIPE_ERROR"
    STRIPE_WEBHOOK_ERROR = "STRIPE_WEBHOOK_ERROR"
    STRIPE_ACCOUNT_ERROR = "STRIPE_ACCOUNT_ERROR"
    STRIPE_PAYOUT_ERROR = "STRIPE_PAYOUT_ERROR"
    
    # Database Errors
    DATABASE_ERROR = "DATABASE_ERROR"
    CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION"
    TRANSACTION_FAILED = "TRANSACTION_FAILED"
    
    # External Service Errors
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    
    # Idempotency Errors
    IDEMPOTENCY_KEY_MISMATCH = "IDEMPOTENCY_KEY_MISMATCH"
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"
    
    # Rate Limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Generic Errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

class ErrorDetail(BaseModel):
    """Structured error detail for API responses."""
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None
    field: Optional[str] = None
    timestamp: Optional[str] = None

class FinwaveError(Exception):
    """Base exception class for Finwave application errors."""
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        field: Optional[str] = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        log_level: str = "error"
    ):
        self.code = code
        self.message = message
        self.details = details or {}
        self.field = field
        self.status_code = status_code
        self.log_level = log_level
        super().__init__(self.message)

class ValidationError(FinwaveError):
    """Raised when input validation fails."""
    
    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        # Convert technical messages to user-friendly ones
        user_friendly_message = self._get_user_friendly_message(message, field)
        
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=user_friendly_message,
            details=details,
            field=field,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            log_level="warning"
        )
    
    def _get_user_friendly_message(self, message: str, field: Optional[str] = None) -> str:
        """Convert technical validation messages to user-friendly ones."""
        
        # Common validation error mappings
        error_mappings = {
            "Invalid idempotency key format": "Request validation failed. Please try again.",
            "Invalid input": "Please check your input and try again.",
            "Missing required field": "Please fill in all required fields.",
            "Invalid email format": "Please enter a valid email address.",
            "Invalid phone number": "Please enter a valid phone number.",
            "Invalid currency": "Please select a valid currency.",
            "Invalid amount": "Please enter a valid amount.",
            "Amount must be positive": "Please enter a positive amount.",
            "Amount too small": "Amount must be at least 0.01.",
            "Amount too large": "Amount is too large. Please contact support.",
            "Invalid beneficiary": "Please select a valid beneficiary.",
            "Invalid destination": "Please select a valid bank account.",
            "Beneficiary not found": "Selected beneficiary not found. Please refresh and try again.",
            "Destination not found": "Selected bank account not found. Please refresh and try again.",
            "Insufficient funds": "Insufficient funds for this payout.",
            "Invalid status": "Invalid operation for current status.",
            "Duplicate request": "This request has already been processed.",
        }
        
        # Check for exact matches first
        if message in error_mappings:
            return error_mappings[message]
        
        # Check for partial matches
        for technical_msg, user_msg in error_mappings.items():
            if technical_msg.lower() in message.lower():
                return user_msg
        
        # Field-specific messages
        if field:
            field_mappings = {
                "beneficiary_id": "Please select a valid beneficiary.",
                "destination_id": "Please select a valid bank account.",
                "amount": "Please enter a valid amount.",
                "currency": "Please select a valid currency.",
                "memo": "Please enter a valid memo.",
                "idempotency_key": "Request validation failed. Please try again.",
            }
            
            if field in field_mappings:
                return field_mappings[field]
        
        # Default fallback
        return "Please check your input and try again."

class ResourceNotFoundError(FinwaveError):
    """Raised when a requested resource is not found."""
    
    def __init__(self, resource_type: str, resource_id: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=ErrorCode.RESOURCE_NOT_FOUND,
            message=f"{resource_type} with ID '{resource_id}' not found",
            details=details,
            status_code=status.HTTP_404_NOT_FOUND,
            log_level="warning"
        )

class BusinessLogicError(FinwaveError):
    """Raised when business logic constraints are violated."""
    
    def __init__(self, code: ErrorCode, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=code,
            message=message,
            details=details,
            status_code=status.HTTP_400_BAD_REQUEST,
            log_level="warning"
        )

class StripeError(FinwaveError):
    """Raised when Stripe API operations fail."""
    
    def __init__(self, message: str, stripe_error: Optional[Exception] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if stripe_error:
            error_details["stripe_error"] = str(stripe_error)
            error_details["stripe_error_type"] = type(stripe_error).__name__
        
        super().__init__(
            code=ErrorCode.STRIPE_ERROR,
            message=message,
            details=error_details,
            status_code=status.HTTP_502_BAD_GATEWAY,
            log_level="error"
        )

class IdempotencyError(FinwaveError):
    """Raised when idempotency key conflicts occur."""
    
    def __init__(self, message: str, existing_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if existing_id:
            error_details["existing_resource_id"] = existing_id
        
        super().__init__(
            code=ErrorCode.IDEMPOTENCY_KEY_MISMATCH,
            message=message,
            details=error_details,
            status_code=status.HTTP_409_CONFLICT,
            log_level="warning"
        )

def log_error(
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> None:
    """Log an error with structured context information."""
    
    log_data = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "traceback": traceback.format_exc(),
    }
    
    if context:
        log_data.update(context)
    
    if user_id:
        log_data["user_id"] = user_id
    
    if request_id:
        log_data["request_id"] = request_id
    
    # Add additional context for specific error types
    if isinstance(error, FinwaveError):
        log_data.update({
            "error_code": error.code.value,
            "status_code": error.status_code,
            "field": error.field,
            "details": error.details,
        })
        
        # Use the specified log level
        log_method = getattr(logger, error.log_level, logger.error)
        log_method("Application error occurred", **log_data)
    else:
        logger.error("Unexpected error occurred", **log_data)

def create_error_response(
    error: Exception,
    include_details: bool = False
) -> Dict[str, Any]:
    """Create a standardized error response for API endpoints."""
    
    if isinstance(error, FinwaveError):
        response = {
            "error": {
                "code": error.code.value,
                "message": error.message,
            }
        }
        
        if include_details and error.details:
            response["error"]["details"] = error.details
        
        if error.field:
            response["error"]["field"] = error.field
        
        return response
    else:
        # For unexpected errors, return a generic message
        return {
            "error": {
                "code": ErrorCode.INTERNAL_SERVER_ERROR.value,
                "message": "An unexpected error occurred. Please try again later.",
            }
        }

def handle_validation_error(exc: Exception) -> HTTPException:
    """Handle Pydantic validation errors and convert to structured response."""
    
    if hasattr(exc, 'errors'):
        # Pydantic validation error
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            message = error["msg"]
            errors.append({
                "field": field,
                "message": message,
                "type": error["type"]
            })
        
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": ErrorCode.VALIDATION_ERROR.value,
                    "message": "Validation failed",
                    "details": {"validation_errors": errors}
                }
            }
        )
    
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "error": {
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": str(exc)
            }
        }
    )

def handle_stripe_error(exc: Exception) -> HTTPException:
    """Handle Stripe API errors and convert to structured response."""
    
    error_message = "Payment processing failed"
    error_details = {"stripe_error": str(exc)}
    
    # Extract specific Stripe error information
    if hasattr(exc, 'code'):
        error_details["stripe_code"] = exc.code
    if hasattr(exc, 'param'):
        error_details["stripe_param"] = exc.param
    if hasattr(exc, 'type'):
        error_details["stripe_type"] = exc.type
    
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            "error": {
                "code": ErrorCode.STRIPE_ERROR.value,
                "message": error_message,
                "details": error_details
            }
        }
    )

def handle_database_error(exc: Exception) -> HTTPException:
    """Handle database errors and convert to structured response."""
    
    error_message = "Database operation failed"
    error_details = {"database_error": str(exc)}
    
    # Check for specific database error types
    if "unique constraint" in str(exc).lower():
        error_code = ErrorCode.CONSTRAINT_VIOLATION
        error_message = "A record with this information already exists"
    elif "foreign key constraint" in str(exc).lower():
        error_code = ErrorCode.CONSTRAINT_VIOLATION
        error_message = "Cannot perform this operation due to related records"
    else:
        error_code = ErrorCode.DATABASE_ERROR
    
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={
            "error": {
                "code": error_code.value,
                "message": error_message,
                "details": error_details
            }
        }
    )
