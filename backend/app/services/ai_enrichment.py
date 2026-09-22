"""
Pipeline d'enrichissement IA complet.

Pour chaque offre :
    1. Resume automatique (FR)
    2. Extraction de competences (GLiNER)
    3. Detection de langue (AfroScope)
    4. Detection du niveau d'experience
    5. Sauvegarde en base (resume_ia, langue, niveau)
    6. Liaison des competences dans job_skills

⚠️ Le premier appel est LENT (~30-60s) : chargement des modeles.
Les appels suivants sont rapides (~1-2s par offre).
"""

from datetime import datetime, timezone

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.services.summarizer import summarize
from app.services.skill_extractor import extract_skills, flatten_skills
from app.services.language_detector import detect_language
from app.services.experience_detector import detect_experience
from app.services.skill_service import get_or_create_skill, link_job_to_skill


logger = get_logger(__name__)

TABLE = "jobs"


def enrich_job_ai(job_id: int, job: dict) -> dict:
    """
    Enrichit une offre avec l'IA.

    Returns:
        Stats de l'enrichissement
    """

    text = f"{job.get('titre', '')}\n{job.get('description', '') or ''}"

    # ==================== 1. Resume ====================
    resume = None
    try:
        resume = summarize(text)
    except Exception as e:
        logger.error(f"Erreur resume #{job_id} : {e}")

    # ==================== 2. Competences ====================
    skills_flat = []
    try:
        skills_dict = extract_skills(text)
        skills_flat = flatten_skills(skills_dict, text)
    except Exception as e:
        logger.error(f"Erreur skills #{job_id} : {e}")

    # ==================== 3. Langue ====================
    langue = None
    try:
        lang = detect_language(text)
        langue = lang.get("langue")
    except Exception as e:
        logger.error(f"Erreur langue #{job_id} : {e}")

    # ==================== 4. Niveau ====================
    niveau = detect_experience(job)

    # ==================== 5. Liaison competences ====================
    linked = 0
    for skill_name in skills_flat:
        skill = get_or_create_skill(skill_name)
        if skill:
            link_job_to_skill(job_id, skill["id"], score=1.0)
            linked += 1

    # ==================== 6. Mise a jour ====================
    update_payload = {
        "resume_ia": resume,
        "langue": langue,
        "niveau": niveau or job.get("niveau"),
        "enriched_at": datetime.now(timezone.utc).isoformat(),
    }

    update_payload = {k: v for k, v in update_payload.items() if v is not None}

    try:
        supabase.table(TABLE).update(update_payload).eq("id", job_id).execute()
    except Exception as e:
        logger.error(f"Erreur update #{job_id} : {e}")

    return {
        "job_id": job_id,
        "resume": bool(resume),
        "skills_count": linked,
        "langue": langue,
        "niveau": niveau,
    }


def enrich_all_jobs_ai(limit: int = 100) -> dict:
    """
    Enrichit toutes les offres sans resume_ia.

    ⚠️ LIMITER a 100 pour eviter les timeouts.

    Args:
        limit : Nombre max d'offres a enrichir

    Returns:
        Statistiques globales
    """

    r = (
        supabase.table(TABLE)
        .select("*")
        .is_("resume_ia", "null")
        .limit(limit)
        .execute()
    )

    jobs = r.data or []

    logger.info(f"{len(jobs)} offres a enrichir avec l'IA")

    processed = 0
    resumed = 0
    skills_linked = 0
    languages = {}

    for job in jobs:
        try:
            result = enrich_job_ai(job["id"], job)
            processed += 1

            if result["resume"]:
                resumed += 1

            skills_linked += result["skills_count"]

            lang = result.get("langue")
            if lang:
                languages[lang] = languages.get(lang, 0) + 1

        except Exception as e:
            logger.error(f"Erreur enrich #{job['id']} : {e}")

    return {
        "processed": processed,
        "resumed": resumed,
        "skills_linked": skills_linked,
        "languages": languages,
    }
