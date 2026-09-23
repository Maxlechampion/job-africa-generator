"""
Schemas Pydantic pour les favoris.
"""

from datetime import datetime

from pydantic import BaseModel


class FavoriteCreate(BaseModel):
    job_id: int
    note: str | None = None


class FavoriteResponse(BaseModel):
    id: int
    user_id: str
    job_id: int
    note: str | None
    created_at: datetime | None
    job: dict | None = None
