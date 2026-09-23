"""
Schemas Pydantic pour les alertes.
"""

from datetime import datetime

from pydantic import BaseModel


class AlertBase(BaseModel):
    nom: str
    mots_cles: str | None = None
    pays: str | None = None
    ville: str | None = None
    categorie: str | None = None
    type_contrat: str | None = None
    teletravail: bool | None = None
    frequence: str = "daily"
    actif: bool = True


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    nom: str | None = None
    mots_cles: str | None = None
    pays: str | None = None
    ville: str | None = None
    categorie: str | None = None
    type_contrat: str | None = None
    teletravail: bool | None = None
    frequence: str | None = None
    actif: bool | None = None


class AlertResponse(AlertBase):
    id: int
    user_id: str
    derniere_notification: datetime | None = None
    created_at: datetime | None = None
