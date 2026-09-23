"""
Schémas Pydantic pour les offres d'emploi.
"""

from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl, field_validator


class JobCreate(BaseModel):
    """
    Schéma pour la création d'une offre.

    Utilisé par POST /jobs.
    """

    titre: str = Field(..., min_length=1, max_length=300)
    entreprise: str | None = Field(None, max_length=200)
    pays: str | None = Field(None, max_length=100)
    ville: str | None = Field(None, max_length=100)
    description: str | None = None
    type_contrat: str | None = Field(None, max_length=50)
    niveau: str | None = Field(None, max_length=50)
    categorie: str | None = Field(None, max_length=100)
    date_publication: datetime | None = None
    date_expiration: datetime | None = None
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
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {
        "from_attributes": True,
    }


class JobListResponse(BaseModel):
    """Réponse paginée pour la liste d'offres."""

    total: int
    limit: int
    offset: int
    results: list[dict]
