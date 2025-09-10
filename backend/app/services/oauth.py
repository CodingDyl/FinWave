import hashlib
import logging
from authlib.integrations.starlette_client import OAuth
from fastapi import Request
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.user import User

logger = logging.getLogger(__name__)

oauth = OAuth()
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=settings.oauth_client_id,
    client_secret=settings.oauth_client_secret,
    client_kwargs={
        "scope": "openid email profile",
        "response_type": "code"
    },
)

def hash_email(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()

async def fetch_or_create_user(request: Request, db: Session) -> User:
    try:
        token = await oauth.google.authorize_access_token(request)
        logger.info(f"OAuth token received: {list(token.keys())}")
        
        # Try to get user info from the access token if id_token is not available
        try:
            # First try to parse ID token (OpenID Connect)
            claims = await oauth.google.parse_id_token(request, token)
            sub = claims["sub"]
            email = claims.get("email", "")
            logger.info(f"User info from ID token: sub={sub}, email={email}")
        except (KeyError, Exception) as e:
            logger.warning(f"ID token parsing failed: {e}, falling back to userinfo API")
            # Fallback: get user info from Google API using access token
            user_info = await oauth.google.get("https://www.googleapis.com/oauth2/v2/userinfo", token=token)
            user_data = user_info.json()
            sub = user_data["id"]
            email = user_data.get("email", "")
            logger.info(f"User info from userinfo API: sub={sub}, email={email}")
        
        email_hash = hash_email(email)

        user = db.query(User).filter(User.oauth_sub == sub).one_or_none()
        if user is None:
            user = User(oauth_sub=sub, email_hash=email_hash)
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user: {user.id}")
        else:
            logger.info(f"Found existing user: {user.id}")
        return user
    except Exception as e:
        logger.error(f"OAuth user creation failed: {e}")
        raise
