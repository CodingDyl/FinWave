"""
Request/Response logging middleware for comprehensive API monitoring.
Tracks performance metrics, errors, and business events across all endpoints.
"""

import time
import uuid
from typing import Callable, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import structlog

from app.services.logging_service import LoggingService, BusinessEvent
from app.core.errors import log_error, create_error_response, FinwaveError

logger = structlog.get_logger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive request/response logging."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logging_service = LoggingService()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and response with comprehensive logging."""
        
        # Generate request ID if not present
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # Extract user ID from session if available
        user_id = None
        try:
            if hasattr(request, 'session') and request.session:
                user_id = str(request.session.get("uid", ""))
        except Exception:
            # Session not available, continue without user_id
            user_id = None
        
        # Start timing
        start_time = time.time()
        
        # Log incoming request
        self.logging_service.log_api_request(
            method=request.method,
            path=request.url.path,
            user_id=user_id,
            request_id=request_id,
            payload=await self._extract_payload(request),
            headers=dict(request.headers)
        )
        
        # Log business event for API access
        self.logging_service.log_business_event(
            event=BusinessEvent.API_REQUEST,
            user_id=user_id,
            details={
                "method": request.method,
                "path": request.url.path,
                "request_id": request_id,
                "query_params": dict(request.query_params)
            }
        )
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate response time
            response_time_ms = (time.time() - start_time) * 1000
            
            # Log successful response
            self.logging_service.log_api_response(
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                response_time_ms=response_time_ms,
                user_id=user_id,
                request_id=request_id
            )
            
            # Log performance metric
            self.logging_service.log_performance_metric(
                metric_name="api_response_time",
                value=response_time_ms,
                unit="ms",
                user_id=user_id,
                details={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code
                }
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Calculate response time for failed requests
            response_time_ms = (time.time() - start_time) * 1000
            
            # Log error response
            self.logging_service.log_api_response(
                method=request.method,
                path=request.url.path,
                status_code=500,  # Will be overridden by error handler
                response_time_ms=response_time_ms,
                user_id=user_id,
                request_id=request_id,
                error=e
            )
            
            # Log the error with context
            log_error_with_context(
                error=e,
                context={
                    "method": request.method,
                    "path": request.url.path,
                    "request_id": request_id,
                    "response_time_ms": response_time_ms,
                    "query_params": dict(request.query_params)
                },
                user_id=user_id
            )
            
            # Handle different error types
            if isinstance(e, FinwaveError):
                return JSONResponse(
                    status_code=e.status_code,
                    content=create_error_response(e, include_details=True),
                    headers={"X-Request-ID": request_id}
                )
            else:
                # Generic error response
                return JSONResponse(
                    status_code=500,
                    content=create_error_response(e),
                    headers={"X-Request-ID": request_id}
                )
    
    async def _extract_payload(self, request: Request) -> dict:
        """Extract and sanitize request payload."""
        try:
            if request.method in ["POST", "PUT", "PATCH"]:
                # Get the raw body
                body = await request.body()
                if body:
                    # Try to parse as JSON
                    import json
                    try:
                        payload = json.loads(body.decode())
                        return self.logging_service._sanitize_payload(payload)
                    except json.JSONDecodeError:
                        return {"raw_body": "***NON_JSON***"}
            return {}
        except Exception as e:
            logger.warning("Failed to extract request payload", error=str(e))
            return {"error": "Failed to extract payload"}

def log_error_with_context(
    error: Exception,
    context: dict,
    user_id: Optional[str] = None
) -> None:
    """Log an error with additional context."""
    from app.core.errors import log_error
    log_error(error, context, user_id)
