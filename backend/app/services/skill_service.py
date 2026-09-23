"""
Service de gestion des competences.
"""

from slugify import slugify

from app.core.logger import get_logger
from app.core.supabase import supabase

logger = get_logger(__name__)
TABLE_SKILLS = "skills"
TABLE_JOB_SKILLS = "job_skills"


def get_or_create_skill(nom: str, categorie: str | None = None) -> dict | None:
    """Retourne une competence existante ou la cree."""

    if not nom or not nom.strip():
        return None

    nom = nom.strip()
    slug = slugify(nom)

    existing = supabase.table(TABLE_SKILLS).select("*").eq("slug", slug).maybe_single().execute()

    if existing and existing.data:
        return existing.data

    try:
        r = (
            supabase.table(TABLE_SKILLS)
            .insert({"nom": nom, "slug": slug, "categorie": categorie})
            .execute()
        )
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur creation skill : {e}")
        return None


def link_job_to_skill(job_id: int, skill_id: int, score: float = 1.0):
    """Cree une relation job <-> skill."""

    try:
        supabase.table(TABLE_JOB_SKILLS).upsert(
            {"job_id": job_id, "skill_id": skill_id, "score": score},
            on_conflict="job_id,skill_id",
        ).execute()
    except Exception as e:
        logger.error(f"Erreur liaison job-skill : {e}")


def get_job_skills(job_id: int) -> list[dict]:
    """Competences d'une offre."""

    r = (
        supabase.table(TABLE_JOB_SKILLS)
        .select("skill_id, score, skills(nom, categorie)")
        .eq("job_id", job_id)
        .execute()
    )

    result = []
    for row in r.data or []:
        sk = row.get("skills") or {}
        result.append(
            {
                "skill_id": row["skill_id"],
                "nom": sk.get("nom"),
                "categorie": sk.get("categorie"),
                "score": row.get("score", 1.0),
            }
        )

    return result


def get_skills(categorie: str | None = None) -> list[dict]:
    """Liste des competences."""
    query = supabase.table(TABLE_SKILLS).select("*")

    if categorie:
        query = query.eq("categorie", categorie)

    return query.order("nom").execute().data or []
