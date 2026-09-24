"""
Service de gestion des offres d'emploi.

CRUD + recherche + statistiques.
"""

from typing import Optional

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.services.normalizer import normalize_job


logger = get_logger(__name__)

TABLE = "jobs"


# ==================== CRÉATION ====================
def create_job(job: dict) -> list[dict]:
    """
    Insère ou met à jour une offre.

    Utilise upsert sur l'URL pour éviter les doublons.
    """

    normalized = normalize_job(job)

    try:
        response = (
            supabase.table(TABLE)
            .upsert(normalized, on_conflict="url")
            .execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur création offre : {e}")
        return []


def bulk_create_jobs(jobs: list[dict]) -> dict:
    """
    Insère un lot d'offres.

    Returns:
        {inserted: int, skipped: int}
    """

    if not jobs:
        return {"inserted": 0, "skipped": 0}

    # Normalisation
    normalized = [normalize_job(j) for j in jobs]

    # Filtre les offres sans URL
    valides = [j for j in normalized if j.get("url")]

    skipped = len(jobs) - len(valides)

    if not valides:
        return {"inserted": 0, "skipped": skipped}

    # Insertion par lots de 100
    inserted = 0
    batch_size = 100

    for i in range(0, len(valides), batch_size):
        batch = valides[i:i + batch_size]

        try:
            response = (
                supabase.table(TABLE)
                .upsert(batch, on_conflict="url")
                .execute()
            )
            inserted += len(response.data or [])
        except Exception as e:
            logger.error(f"Erreur insertion lot : {e}")

    return {"inserted": inserted, "skipped": skipped}


# ==================== LECTURE ====================
def get_jobs(
    limit: int = 50,
    offset: int = 0,
    q: Optional[str] = None,
    pays: Optional[str] = None,
    ville: Optional[str] = None,
    categorie: Optional[str] = None,
    type_contrat: Optional[str] = None,
    teletravail: Optional[bool] = None,
) -> dict:
    """
    Recherche paginée avec filtres.

    Returns:
        {total: int, limit: int, offset: int, results: list}
    """

    query = supabase.table(TABLE).select("*", count="exact")

    # Recherche texte
    if q:
        query = query.or_(
            f"titre.ilike.%{q}%,"
            f"description.ilike.%{q}%,"
            f"entreprise.ilike.%{q}%"
        )

    # Filtres
    if pays:
        query = query.ilike("pays", f"%{pays}%")

    if ville:
        query = query.ilike("ville", f"%{ville}%")

    if categorie:
        query = query.eq("categorie", categorie)

    if type_contrat:
        query = query.eq("type_contrat", type_contrat)

    if teletravail is not None:
        query = query.eq("teletravail", teletravail)

    # Pagination + tri (boost_score en premier, puis created_at)
    response = (
        query
        .order("boost_score", desc=True)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return {
        "total": response.count or 0,
        "limit": limit,
        "offset": offset,
        "results": response.data or [],
    }


def get_job(job_id: int) -> Optional[dict]:
    """Récupère une offre par son ID."""

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .eq("id", job_id)
            .maybe_single()
            .execute()
        )
        return response.data if response else None

    except Exception as e:
        logger.error(f"Erreur lecture offre {job_id} : {e}")
        return None


# ==================== STATISTIQUES ====================
def get_stats() -> dict:
    """Statistiques globales."""

    try:
        total = (
            supabase.table(TABLE)
            .select("id", count="exact")
            .execute()
        )
        return {"total_offres": total.count or 0}

    except Exception as e:
        logger.error(f"Erreur stats : {e}")
        return {"total_offres": 0}


def get_countries() -> list[str]:
    """Liste des pays présents."""

    try:
        response = (
            supabase.table(TABLE)
            .select("pays")
            .not_.is_("pays", "null")
            .execute()
        )
        return sorted({
            r["pays"] for r in response.data or []
            if r.get("pays")
        })

    except Exception as e:
        logger.error(f"Erreur countries : {e}")
        return []


def get_categories() -> list[str]:
    """Liste des catégories présentes."""

    try:
        response = (
            supabase.table(TABLE)
            .select("categorie")
            .not_.is_("categorie", "null")
            .execute()
        )
        return sorted({
            r["categorie"] for r in response.data or []
            if r.get("categorie")
        })

    except Exception as e:
        logger.error(f"Erreur categories : {e}")
        return []


def get_sources() -> list[str]:
    """Liste des sources présentes."""

    try:
        response = (
            supabase.table(TABLE)
            .select("source")
            .not_.is_("source", "null")
            .execute()
        )
        return sorted({
            r["source"] for r in response.data or []
            if r.get("source")
        })

    except Exception as e:
        logger.error(f"Erreur sources : {e}")
        return []