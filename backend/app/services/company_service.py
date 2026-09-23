"""
Service de gestion des entreprises.
"""

from slugify import slugify

from app.core.logger import get_logger
from app.core.supabase import supabase

logger = get_logger(__name__)
TABLE = "companies"


def get_or_create_company(nom: str, **extra) -> dict | None:
    """Retourne une entreprise existante ou la cree."""

    if not nom or not nom.strip():
        return None

    nom = nom.strip()
    slug = slugify(nom)

    existing = supabase.table(TABLE).select("*").eq("slug", slug).maybe_single().execute()

    if existing and existing.data:
        return existing.data

    payload = {"nom": nom, "slug": slug, **extra}

    try:
        r = supabase.table(TABLE).insert(payload).execute()
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur creation entreprise : {e}")
        return None


def get_companies(limit: int = 100) -> list[dict]:
    """Liste des entreprises."""
    return supabase.table(TABLE).select("*").order("nom").limit(limit).execute().data or []


def get_company(company_id: int) -> dict | None:
    """Recupere une entreprise par ID."""
    r = supabase.table(TABLE).select("*").eq("id", company_id).maybe_single().execute()
    return r.data if r else None
