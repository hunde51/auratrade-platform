from fastapi import APIRouter
from pydantic import BaseModel

from app.services.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenRequest(BaseModel):
    subject: str


@router.post("/token")
async def issue_token(payload: TokenRequest) -> dict[str, str]:
    token = create_access_token(payload.subject)
    return {"access_token": token, "token_type": "bearer"}
