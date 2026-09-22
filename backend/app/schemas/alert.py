"""
Schemas Pydantic pour les alertes.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AlertBase(BaseModel):
    nom: str
    mots_cles: Optional[str] = None
    pays: Optional[str] = None
    ville: Optional[str] = None
    categorie: Optional[str] = None
    type_contrat: Optional[str] = None
    teletravail: Optional[bool] = None
    frequence: str = "daily"
    actif: bool = True


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    nom: Optional[str] = None
    mots_cles: Optional[str] = None
    pays: Optional[str] = None
    ville: Optional[str] = None
    categorie: Optional[str] = None
    type_contrat: Optional[str] = None
    teletravail: Optional[bool] = None
    frequence: Optional[str] = None
    actif: Optional[bool] = None


class AlertResponse(AlertBase):
    id: int
    user_id: str
    derniere_notification: Optional[datetime] = None
    created_at: Optional[datetime] = None
