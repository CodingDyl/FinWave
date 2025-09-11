from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/api/v1/stripe", tags=["stripe"])

@router.get("/config")
def stripe_config():
    return {"publishableKey": settings.stripe_publishable_key}
