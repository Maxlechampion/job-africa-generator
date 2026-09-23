"""
Schemas Pydantic pour l'authentification.
"""

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    nom: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthUser(BaseModel):
    id: str
    email: str | None = None
    user_role: str = "user"
    nom: str | None = None


class AuthResponse(BaseModel):
    user: AuthUser
    access_token: str
    refresh_token: str | None = None
    expires_in: int | None = None
