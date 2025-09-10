import hashlib
from authlib.integrations.starlette_client import OAuth
from fastapi import Request
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.user import User

oauth = OAuth()
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=settings.oauth_client_id,
    client_secret=settings.oauth_client_secret,
    client_kwargs={"scope": "openid email profile"},
)

def hash_email(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()

async def fetch_or_create_user(request: Request, db: Session) -> User:
    token = await oauth.google.authorize_access_token(request)
    # OIDC: parse ID token claims (contains sub, email)
    claims = await oauth.google.parse_id_token(request, token)
    sub = claims["sub"]
    email_hash = hash_email(claims.get("email", ""))

    user = db.query(User).filter(User.oauth_sub == sub).one_or_none()
    if user is None:
        user = User(oauth_sub=sub, email_hash=email_hash)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
