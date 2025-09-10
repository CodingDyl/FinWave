from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from app.services.oauth import oauth, fetch_or_create_user
from app.db.session import get_session
from sqlalchemy.orm import Session
from app.schemas.auth import MeOut
from app.core.config import settings

router = APIRouter()

@router.get("/login")
async def login(request: Request):
    # Use the configured OAuth redirect URI
    redirect_uri = settings.oauth_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback", name="auth_callback")
async def callback(request: Request, db: Session = Depends(get_session)):
    user = await fetch_or_create_user(request, db)
    request.session["uid"] = user.id
    # bounce back to frontend
    return RedirectResponse(url="/")  # your SPA root

@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}

# backend/app/api/v1/routes/auth.py
@router.get("/me", response_model=MeOut)
async def me(request: Request, db: Session = Depends(get_session)):
    uid = request.session.get("uid")
    if not uid:
        return MeOut(user_id=0, email_hash="")
    from app.models.user import User
    u = db.get(User, uid)
    return MeOut(user_id=u.id, email_hash=u.email_hash) if u else MeOut(user_id=0, email_hash="")
