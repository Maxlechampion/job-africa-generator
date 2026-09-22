"""
Schemas Pydantic pour l'authentification.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    nom: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthUser(BaseModel):
    id: str
    email: Optional[str] = None
    user_role: str = "user"
    nom: Optional[str] = None


class AuthResponse(BaseModel):
    user: AuthUser
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
