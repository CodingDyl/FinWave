from fastapi import HTTPException
from app.core.config import settings

def ensure_dev():
    """Dependency to block calls in non-dev environments"""
    if settings.env_name not in {"dev", "local", "test"}:
        raise HTTPException(status_code=403, detail="Dev-only endpoint")
