"""
Service de gestion des sources de collecte.
"""

from app.core.logger import get_logger
from app.core.supabase import supabase

logger = get_logger(__name__)
TABLE = "sources"


def get_sources(actif_only: bool = False) -> list[dict]:
    """Retourne toutes les sources."""
    query = supabase.table(TABLE).select("*")

    if actif_only:
        query = query.eq("actif", True)

    return query.order("nom").execute().data or []


def get_source(source_id: int) -> dict | None:
    """Recupere une source par ID."""
    r = supabase.table(TABLE).select("*").eq("id", source_id).maybe_single().execute()
    return r.data if r else None


def create_source(data: dict) -> dict:
    """Cree une source."""
    return supabase.table(TABLE).insert(data).execute().data[0]


def update_source(source_id: int, data: dict) -> dict:
    """Met a jour une source."""
    return supabase.table(TABLE).update(data).eq("id", source_id).execute().data[0]
