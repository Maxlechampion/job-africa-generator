"""
Schemas Pydantic pour les competences.
"""

from typing import Optional
from pydantic import BaseModel


class SkillBase(BaseModel):
    nom: str
    categorie: Optional[str] = None
    alias: Optional[list[str]] = None


class SkillResponse(SkillBase):
    id: int
    slug: str


class JobSkillResponse(BaseModel):
    skill_id: int
    nom: str
    categorie: Optional[str]
    score: float
