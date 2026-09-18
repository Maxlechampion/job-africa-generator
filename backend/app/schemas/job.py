"""
Schémas Pydantic pour les offres d'emploi.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl, field_validator


class JobCreate(BaseModel):
    """
    Schéma pour la création d'une offre.

    Utilisé par POST /jobs.
    """

    titre: str = Field(..., min_length=1, max_length=300)
    entreprise: Optional[str] = Field(None, max_length=200)
    pays: Optional[str] = Field(None, max_length=100)
    ville: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    type_contrat: Optional[str] = Field(None, max_length=50)
    niveau: Optional[str] = Field(None, max_length=50)
    categorie: Optional[str] = Field(None, max_length=100)
    date_publication: Optional[datetime] = None
    date_expiration: Optional[datetime] = None
    url: HttpUrl
    source: str = Field(..., min_length=1, max_length=100)
    teletravail: bool = False

    @field_validator("titre")
    @classmethod
    def titre_non_vide(cls, v: str) -> str:
        """Vérifie que le titre n'est pas vide."""
        if not v.strip():
            raise ValueError("Le titre ne peut pas être vide")
        return v.strip()

    @field_validator("source")
    @classmethod
    def source_non_vide(cls, v: str) -> str:
        """Vérifie que la source n'est pas vide."""
        if not v.strip():
            raise ValueError("La source ne peut pas être vide")
        return v.strip()


class JobResponse(JobCreate):
    """Schéma de réponse pour une offre."""

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
    }


class JobListResponse(BaseModel):
    """Réponse paginée pour la liste d'offres."""

    total: int
    limit: int
    offset: int
    results: list[dict]
