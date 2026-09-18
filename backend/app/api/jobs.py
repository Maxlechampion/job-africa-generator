"""
Routes API pour les offres d'emploi.
"""

from fastapi import APIRouter, HTTPException, Query

from app.schemas.job import JobCreate
from app.services.job_service import (
    create_job,
    get_job,
    get_jobs,
)


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", summary="Lister les offres")
def list_jobs(
    q: str | None = Query(None, description="Recherche par mot-clé"),
    pays: str | None = Query(None, description="Filtrer par pays"),
    ville: str | None = Query(None, description="Filtrer par ville"),
    categorie: str | None = Query(None, description="Filtrer par catégorie"),
    type_contrat: str | None = Query(None, description="Filtrer par contrat"),
    teletravail: bool | None = Query(None, description="Télétravail uniquement"),
    limit: int = Query(50, ge=1, le=200, description="Nombre max de résultats"),
    offset: int = Query(0, ge=0, description="Offset de pagination"),
):
    """
    Liste paginée des offres avec filtres multiples.
    """

    return get_jobs(
        limit=limit,
        offset=offset,
        q=q,
        pays=pays,
        ville=ville,
        categorie=categorie,
        type_contrat=type_contrat,
        teletravail=teletravail,
    )


@router.get("/{job_id}", summary="Détail d'une offre")
def find_job(job_id: int):
    """
    Récupère une offre par son ID.
    """

    job = get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")

    return job


@router.post("", status_code=201, summary="Créer une offre")
def add_job(job: JobCreate):
    """
    Crée une nouvelle offre.
    """

    result = create_job(job.model_dump())

    if not result:
        raise HTTPException(status_code=500, detail="Erreur création offre")

    return result[0] if isinstance(result, list) else result
