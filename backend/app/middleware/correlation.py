import uuid, structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from structlog.contextvars import bind_contextvars, clear_contextvars

HEADER = "X-Correlation-ID"

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        clear_contextvars()
        cid = request.headers.get(HEADER) or str(uuid.uuid4())
        bind_contextvars(correlation_id=cid)
        response: Response = await call_next(request)
        response.headers[HEADER] = cid
        return response

logger = structlog.get_logger()
