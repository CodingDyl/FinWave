"""
Global error handler middleware for consistent error responses and logging.
Handles all unhandled exceptions and converts them to structured API responses.
"""

import traceback
from typing import Union
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
import stripe.error
import structlog

from app.core.errors import (
    FinwaveError, 
    create_error_response, 
    handle_validation_error,
    handle_stripe_error,
    handle_database_error,
    log_error,
    ErrorCode
)

logger = structlog.get_logger(__name__)

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for all unhandled exceptions."""
    
    # Extract context information
    user_id = None
    if hasattr(request, 'session') and request.session:
        user_id = str(request.session.get("uid", ""))
    
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    context = {
        "method": request.method,
        "path": request.url.path,
        "request_id": request_id,
        "query_params": dict(request.query_params),
        "user_id": user_id
    }
    
    # Handle different types of exceptions
    if isinstance(exc, FinwaveError):
        # Our custom application errors
        log_error(exc, context, user_id)
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(exc, include_details=True),
            headers={"X-Request-ID": request_id}
        )
    
    elif isinstance(exc, RequestValidationError):
        # Pydantic validation errors
        logger.warning("Validation error", **context, validation_errors=exc.errors())
        return handle_validation_error(exc)
    
    elif isinstance(exc, (HTTPException, StarletteHTTPException)):
        # FastAPI/Starlette HTTP exceptions
        logger.warning("HTTP exception", **context, status_code=exc.status_code, detail=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": ErrorCode.VALIDATION_ERROR.value,
                    "message": str(exc.detail)
                }
            },
            headers={"X-Request-ID": request_id}
        )
    
    elif isinstance(exc, stripe.error.StripeError):
        # Stripe API errors
        logger.error("Stripe error", **context, stripe_error=str(exc))
        return handle_stripe_error(exc)
    
    elif isinstance(exc, SQLAlchemyError):
        # Database errors
        logger.error("Database error", **context, database_error=str(exc))
        return handle_database_error(exc)
    
    else:
        # Unexpected errors
        logger.error("Unexpected error", **context, error_type=type(exc).__name__, error_message=str(exc))
        log_error(exc, context, user_id)
        
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": ErrorCode.INTERNAL_SERVER_ERROR.value,
                    "message": "An unexpected error occurred. Please try again later.",
                    "request_id": request_id
                }
            },
            headers={"X-Request-ID": request_id}
        )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handler for HTTP exceptions."""
    
    user_id = None
    if hasattr(request, 'session') and request.session:
        user_id = str(request.session.get("uid", ""))
    
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    context = {
        "method": request.method,
        "path": request.url.path,
        "request_id": request_id,
        "status_code": exc.status_code,
        "user_id": user_id
    }
    
    logger.warning("HTTP exception", **context, detail=exc.detail)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": str(exc.detail)
            }
        },
        headers={"X-Request-ID": request_id}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handler for validation exceptions."""
    
    user_id = None
    if hasattr(request, 'session') and request.session:
        user_id = str(request.session.get("uid", ""))
    
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    context = {
        "method": request.method,
        "path": request.url.path,
        "request_id": request_id,
        "validation_errors": exc.errors(),
        "user_id": user_id
    }
    
    logger.warning("Validation error", **context)
    
    return handle_validation_error(exc)

def setup_error_handlers(app):
    """Set up all error handlers for the FastAPI application."""
    
    # Global exception handler
    app.add_exception_handler(Exception, global_exception_handler)
    
    # HTTP exception handler
    app.add_exception_handler(HTTPException, http_exception_handler)
    
    # Validation exception handler
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # Stripe error handlers
    app.add_exception_handler(stripe.error.StripeError, lambda request, exc: handle_stripe_error(exc))
    
    # Database error handlers
    app.add_exception_handler(SQLAlchemyError, lambda request, exc: handle_database_error(exc))
    
    logger.info("Error handlers configured successfully")
