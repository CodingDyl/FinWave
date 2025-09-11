from pydantic import BaseModel

class MeOut(BaseModel):
    user_id: int
    email_hash: str
    name: str | None = None
    email: str | None = None
    picture: str | None = None
