from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str
    username: str | None = Field(default=None, min_length=3, max_length=100)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    is_active: bool
