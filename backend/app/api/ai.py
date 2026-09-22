"""
Routes API pour l'IA.

⚠️ Les endpoints IA necessitent les packages lourds
(transformers, torch, gliner) qui ne sont PAS installes
sur Render Free. Ils fonctionnent uniquement en local.

Sur Render, ces endpoints retournent une erreur 503
"IA non disponible".
"""

from fastapi import APIRouter, HTTPException

from app.core.logger import get_logger


logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


# ==================== Verification des packages IA ====================
try:
    from app.services.summarizer import summarize
    from app.services.skill_extractor import extract_skills, flatten_skills
    from app.services.language_detector import detect_language
    from app.services.embeddings import encode, similarity
    from app.services.ai_enrichment import enrich_all_jobs_ai, enrich_job_ai
    from app.services.job_service import get_job, get_jobs

    AI_AVAILABLE = True
    logger.info("Modules IA charges avec succes")

except ImportError as e:
    AI_AVAILABLE = False
    logger.warning(f"Modules IA non disponibles : {e}")


def _check_ai_available():
    """Verifie que les modules IA sont charges."""

    if not AI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "Endpoints IA non disponibles en production. "
                "Ces endpoints necessitent des packages lourds "
                "(transformers, torch, gliner) qui ne sont pas "
                "installes sur Render Free. Utilisez ces endpoints "
                "en local."
            ),
        )


# ==================== Resume ====================
@router.get("/jobs/{job_id}/summary")
def job_summary(job_id: int):
    """Genere un resume IA d'une offre."""

    _check_ai_available()

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    text = f"{job.get('titre', '')}\n{job.get('description', '') or ''}"

    return {"job_id": job_id, "resume": summarize(text)}


# ==================== Competences ====================
@router.get("/jobs/{job_id}/skills")
def job_skills(job_id: int):
    """Extrait les competences d'une offre via GLiNER."""

    _check_ai_available()

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    text = f"{job.get('titre', '')}\n{job.get('description', '') or ''}"

    skills = extract_skills(text)

    return {
        "job_id": job_id,
        "competences": flatten_skills(skills),
        "categories": skills,
    }


# ==================== Langue ====================
@router.get("/jobs/{job_id}/language")
def job_language(job_id: int):
    """Detecte la langue d'une offre."""

    _check_ai_available()

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    text = f"{job.get('titre', '')} {job.get('description', '') or ''}"

    return detect_language(text)


# ==================== Enrichissement d'une offre ====================
@router.post("/jobs/{job_id}/enrich")
def job_enrich(job_id: int):
    """Enrichit une offre avec l'IA."""

    _check_ai_available()

    job = get_job(job_id)

    if not job:
        raise HTTPException(404, "Offre introuvable")

    return enrich_job_ai(job_id, job)


# ==================== Enrichissement en masse ====================
@router.post("/enrich-all")
def enrich_all(limit: int = 100):
    """Enrichit toutes les offres sans resume_ia."""

    _check_ai_available()

    return enrich_all_jobs_ai(limit)


# ==================== Matching ====================
@router.post("/match")
def match_jobs(profil: str, limit: int = 10):
    """Trouve les offres les plus pertinentes pour un profil."""

    _check_ai_available()

    jobs = get_jobs(limit=200).get("results", [])

    if not jobs:
        return []

    job_texts = [
        f"{j.get('titre', '')}. {j.get('description', '') or ''}"
        for j in jobs
    ]

    all_texts = [profil] + job_texts
    embeddings = encode(all_texts)

    profil_emb = embeddings[0]
    job_embs = embeddings[1:]

    scores = job_embs @ profil_emb
    indices = scores.argsort()[::-1][:limit]

    return [
        {
            "job_id": jobs[i]["id"],
            "titre": jobs[i].get("titre", ""),
            "score": round(float(scores[i]), 4),
            "url": jobs[i].get("url"),
        }
        for i in indices
    ]