"""
Routes API pour le partage social.
"""

from fastapi import APIRouter, Header, HTTPException, Request

from app.schemas.share import (
    JobOGData,
    ShareCreate,
    ShareResponse,
    ShareStats,
)
from app.services.share_service import (
    build_og_data,
    build_share_urls,
    get_job_share_stats,
    record_share,
)
from app.services.job_service import get_job


router = APIRouter(prefix="/share", tags=["share"])


@router.post("/track", response_model=ShareResponse)
def track_share(
    payload: ShareCreate,
    request: Request,
    user_agent: str | None = Header(None),
    referer: str | None = Header(None),
):
    """Enregistre un partage."""

    job = get_job(payload.job_id)
    if not job:
        raise HTTPException(404, "Offre introuvable")

    client_ip = request.client.host if request.client else None

    record_share(
        job_id=payload.job_id,
        canal=payload.canal,
        user_agent=user_agent,
        referrer=payload.referrer or referer,
        ip=client_ip,
    )

    return ShareResponse(success=True, message="Partage enregistre")


@router.get("/jobs/{job_id}/urls")
def get_share_urls(job_id: int):
    """Retourne les URLs de partage pour chaque canal."""

    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Offre introuvable")

    return build_share_urls(job)


@router.get("/jobs/{job_id}/stats", response_model=ShareStats)
def get_stats(job_id: int):
    """Retourne les statistiques de partage d'une offre."""
    return get_job_share_stats(job_id)


@router.get("/jobs/{job_id}/og", response_model=JobOGData)
def get_og(job_id: int, lang: str = "fr"):
    """Retourne les donnees Open Graph pour une offre."""

    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Offre introuvable")

    return build_og_data(job, lang)
