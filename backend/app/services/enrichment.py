"""
Pipeline d'enrichissement complet d'une offre.

Cree automatiquement :
    - l'entreprise (si absente)
    - la source (si absente)
    - les competences (depuis le titre/description)
    - les liens job <-> skill
"""

from datetime import UTC, datetime

from app.core.logger import get_logger
from app.core.supabase import supabase
from app.services.company_service import get_or_create_company
from app.services.skill_service import (
    get_or_create_skill,
    link_job_to_skill,
)

logger = get_logger(__name__)
TABLE = "jobs"


# ==================== Extraction basique de competences ====================
# (sera ameliore par le module 08 IA)

SKILLS_BASIC = [
    "Python",
    "JavaScript",
    "TypeScript",
    "Java",
    "PHP",
    "Ruby",
    "Go",
    "Rust",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "Django",
    "Flask",
    "FastAPI",
    "Vue",
    "React",
    "Angular",
    "Next.js",
    "Laravel",
    "Docker",
    "Kubernetes",
    "Git",
    "CI/CD",
    "AWS",
    "Azure",
    "GCP",
    "Linux",
    "Bash",
    "Excel",
    "Word",
    "PowerPoint",
    "SAP",
    "QuickBooks",
    "SEO",
    "Google Analytics",
    "Facebook Ads",
    "HubSpot",
    "Figma",
    "Photoshop",
    "Illustrator",
]


def detect_skills(job: dict) -> list[str]:
    """Detecte les competences basiques dans une offre."""

    texte = (f"{job.get('titre', '')} {job.get('description', '') or ''}").lower()

    found = []

    for skill in SKILLS_BASIC:
        if skill.lower() in texte:
            found.append(skill)

    return found


def enrich_job(job_id: int, job: dict) -> dict:
    """
    Enrichit une offre :
        - Cree/recupere l'entreprise
        - Cree/recupere la source
        - Detecte les competences
        - Lie les competences
        - Met a jour l'offre
    """

    logger.info(f"Enrichissement offre #{job_id}")

    # ==================== 1. Entreprise ====================
    company_id = None
    if job.get("entreprise"):
        company = get_or_create_company(
            job["entreprise"],
            pays=job.get("pays"),
            ville=job.get("ville"),
        )
        if company:
            company_id = company["id"]

    # ==================== 2. Competences ====================
    skills = detect_skills(job)
    linked_skills = 0

    for skill_name in skills:
        skill = get_or_create_skill(skill_name)
        if skill:
            link_job_to_skill(job_id, skill["id"], score=1.0)
            linked_skills += 1

    # ==================== 3. Met a jour l'offre ====================
    update_payload = {
        "company_id": company_id,
        "enriched_at": datetime.now(UTC).isoformat(),
    }

    update_payload = {k: v for k, v in update_payload.items() if v is not None}

    try:
        supabase.table(TABLE).update(update_payload).eq("id", job_id).execute()
    except Exception as e:
        logger.error(f"Erreur update offre : {e}")

    return {
        "job_id": job_id,
        "company_id": company_id,
        "skills_count": linked_skills,
    }


def enrich_all_jobs(limit: int = 5000) -> dict:
    """Enrichit toutes les offres."""

    r = supabase.table(TABLE).select("*").is_("company_id", "null").limit(limit).execute()

    jobs = r.data or []

    logger.info(f"{len(jobs)} offres a enrichir")

    processed = 0
    companies_created = 0
    skills_linked = 0

    for job in jobs:
        result = enrich_job(job["id"], job)
        processed += 1
        if result["company_id"]:
            companies_created += 1
        skills_linked += result["skills_count"]

    return {
        "processed": processed,
        "companies_linked": companies_created,
        "skills_linked": skills_linked,
    }
