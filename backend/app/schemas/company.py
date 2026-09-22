"""
Schemas Pydantic pour les entreprises.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CompanyBase(BaseModel):
    nom: str
    secteur: Optional[str] = None
    taille: Optional[str] = None
    site_web: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    pays: Optional[str] = None
    ville: Optional[str] = None


class CompanyResponse(CompanyBase):
    id: int
    slug: str
    created_at: Optional[datetime] = None
