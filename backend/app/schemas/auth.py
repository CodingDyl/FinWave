from pydantic import BaseModel

class MeOut(BaseModel):
    user_id: int
    email_hash: str
