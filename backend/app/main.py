from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from redis.asyncio import Redis
from fastapi_limiter import FastAPILimiter
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.logging import configure_logging
from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.errors import SafeErrorsMiddleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.error_handler import setup_error_handlers
from app.api.v1.routes import auth, payouts, webhooks, beneficiaries, destinations, stripe_public, stripe_checkout, stripe_dev, connected_accounts
from app.db.session import get_session

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
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(SafeErrorsMiddleware)
    
    # Set up comprehensive error handling
    setup_error_handlers(app)

    # --- Health endpoints ---
    @app.get("/health", include_in_schema=False, tags=["health"])
    async def health():
        # Simple liveness probe
        return {"ok": True, "service": "finwave-api", "version": app.version}

    @app.get("/health/ready", include_in_schema=False, tags=["health"])
    async def readiness(db: Session = Depends(get_session)):
        # Deeper readiness check (DB + Redis if limiter is initialized)
        checks = {"db": False, "redis": False}
        try:
            db.execute(text("SELECT 1"))
            checks["db"] = True
        except Exception:
            checks["db"] = False

        try:
            redis = getattr(FastAPILimiter, "redis", None)
            if redis:
                await redis.ping()
                checks["redis"] = True
            else:
                # If limiter isn't configured (e.g. in tests), don't fail readiness on Redis
                checks["redis"] = True
        except Exception:
            checks["redis"] = False

        return {"ok": all(checks.values()), **checks, "service": "finwave-api", "version": app.version}
    # --- /Health endpoints ---

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(beneficiaries.router, prefix="/api/v1/beneficiaries", tags=["beneficiaries"])
    app.include_router(destinations.router, prefix="/api/v1/beneficiaries", tags=["destinations"])
    app.include_router(payouts.router, prefix="/api/v1/payouts", tags=["payouts"])
    app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])
    app.include_router(stripe_public.router, prefix="/api/v1/stripe", tags=["stripe"])
    app.include_router(stripe_checkout.router, prefix="/api/v1/stripe", tags=["stripe"])
    app.include_router(connected_accounts.router, tags=["connected-accounts"])
    app.include_router(stripe_dev.router, tags=["stripe-dev"])

    @app.on_event("startup")
    async def _startup():
        if settings.app_env != "test":
            redis = Redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
            await FastAPILimiter.init(redis)

    return app

app = create_app()
