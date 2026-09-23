"""
Routes API pour les competences.
"""

from fastapi import APIRouter

from app.services.skill_service import get_job_skills, get_skills

router = APIRouter(tags=["skills"])


@router.get("/skills")
def list_skills(categorie: str | None = None):
    """Liste des competences."""
    return get_skills(categorie)


@router.get("/jobs/{job_id}/skills-list")
def job_skills(job_id: int):
    """Competences d'une offre."""
    return get_job_skills(job_id)
