"""
Schemas Pydantic pour les favoris.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FavoriteCreate(BaseModel):
    job_id: int
    note: Optional[str] = None


class FavoriteResponse(BaseModel):
    id: int
    user_id: str
    job_id: int
    note: Optional[str]
    created_at: Optional[datetime]
    job: Optional[dict] = None
