from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db
from app.core.config import settings
from app.core.security import verify_signature
from app.services.webhooks import store_webhook_event

router = APIRouter()

@router.post("/provider")
async def receive_webhook(
    request: Request,
    db: Session = Depends(get_db),
    signature: str | None = Header(default=None, alias="Finwave-Signature"),
):
    body = await request.body()
    is_valid = verify_signature(body, signature or "", settings.webhook_secret, settings.webhook_tolerance_seconds)
    store_webhook_event(db, provider="provider", payload=(await request.json() if body else {}), signature_header=signature or "", valid=is_valid)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid signature or timestamp")
    return {"ok": True}
