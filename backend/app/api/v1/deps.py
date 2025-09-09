from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User

security = HTTPBearer()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(security)
) -> User:
    """
    Get current user from JWT token.
    This is a placeholder implementation.
    """
    # TODO: Implement JWT token validation
    # For now, raise not implemented
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication not implemented yet"
    )
