from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from redis.asyncio import Redis
from fastapi_limiter import FastAPILimiter

from app.core.config import settings
from app.core.logging import configure_logging
from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.errors import SafeErrorsMiddleware
from app.api.v1.routes import auth, payouts, webhooks

def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Finwave API", version="1.0.0")

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(o) for o in settings.cors_origins],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Correlation-ID"],
        )

    # Secure session cookie for auth (no PII stored)
    app.add_middleware(SessionMiddleware, secret_key=settings.secret_key, same_site="lax", https_only=False)

    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(SafeErrorsMiddleware)

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(payouts.router, prefix="/api/v1/payouts", tags=["payouts"])
    app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])

    @app.on_event("startup")
    async def _startup():
        if settings.app_env != "test":
            redis = Redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
            await FastAPILimiter.init(redis)

    return app

app = create_app()
