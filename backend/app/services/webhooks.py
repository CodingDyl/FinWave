from sqlalchemy.orm import Session
from app.models.webhook_event import WebhookEvent

def store_webhook_event(db: Session, provider: str, payload: dict, signature_header: str, valid: bool) -> WebhookEvent:
    evt = WebhookEvent(provider=provider, payload=payload, signature_header=signature_header, valid=valid)
    db.add(evt)
    db.commit()
    db.refresh(evt)
    return evt
