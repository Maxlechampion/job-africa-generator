"""
Schemas Pydantic pour les sources.
"""

from datetime import datetime

from pydantic import BaseModel


class SourceBase(BaseModel):
    nom: str
    url: str | None = None
    type: str
    pays: str | None = None
    categorie: str | None = None
    actif: bool = True
    frequence_heures: int = 6


class SourceCreate(SourceBase):
    pass


class SourceResponse(SourceBase):
    id: int
    derniere_collecte: datetime | None = None
    dernier_statut: str | None = None
    nombre_offres_total: int = 0
