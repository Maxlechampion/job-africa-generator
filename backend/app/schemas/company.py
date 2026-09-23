"""
Schemas Pydantic pour les entreprises.
"""

from datetime import datetime

from pydantic import BaseModel


class CompanyBase(BaseModel):
    nom: str
    secteur: str | None = None
    taille: str | None = None
    site_web: str | None = None
    logo_url: str | None = None
    description: str | None = None
    pays: str | None = None
    ville: str | None = None


class CompanyResponse(CompanyBase):
    id: int
    slug: str
    created_at: datetime | None = None
