"""
Schemas Pydantic pour les competences.
"""

from pydantic import BaseModel


class SkillBase(BaseModel):
    nom: str
    categorie: str | None = None
    alias: list[str] | None = None


class SkillResponse(SkillBase):
    id: int
    slug: str


class JobSkillResponse(BaseModel):
    skill_id: int
    nom: str
    categorie: str | None
    score: float
