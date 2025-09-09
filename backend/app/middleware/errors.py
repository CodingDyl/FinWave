from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

SAFE_MSG = "An unexpected error occurred. Please try again."
logger = structlog.get_logger()

class SafeErrorsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            # Log with correlation id bound; no secrets/PII
            logger.exception("unhandled_error")
            return JSONResponse(
                status_code=500,
                content={"error": {"code": "internal_error", "message": SAFE_MSG}},
            )
