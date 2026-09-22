"""
Schemas Pydantic pour les sources.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SourceBase(BaseModel):
    nom: str
    url: Optional[str] = None
    type: str
    pays: Optional[str] = None
    categorie: Optional[str] = None
    actif: bool = True
    frequence_heures: int = 6


class SourceCreate(SourceBase):
    pass


class SourceResponse(SourceBase):
    id: int
    derniere_collecte: Optional[datetime] = None
    dernier_statut: Optional[str] = None
    nombre_offres_total: int = 0
