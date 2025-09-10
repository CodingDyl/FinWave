from typing import Generator
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_session
from app.models.user import User

def get_db() -> Generator[Session, None, None]:
    yield from get_session()

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("uid")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized")
    return user
