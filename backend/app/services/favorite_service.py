"""
Service de gestion des favoris.
"""

from app.core.supabase import supabase
from app.core.logger import get_logger


logger = get_logger(__name__)
TABLE = "favorites"


def add_favorite(user_id: str, job_id: int, note: str | None = None) -> dict:
    """Ajoute un favori."""

    payload = {"user_id": user_id, "job_id": job_id, "note": note}

    r = supabase.table(TABLE).upsert(
        payload, on_conflict="user_id,job_id"
    ).execute()

    return r.data[0] if r.data else {}


def remove_favorite(user_id: str, job_id: int):
    """Supprime un favori."""
    supabase.table(TABLE).delete().eq("user_id", user_id).eq("job_id", job_id).execute()


def get_favorites(user_id: str) -> list[dict]:
    """Favoris d'un utilisateur."""

    r = (
        supabase.table(TABLE)
        .select("*, jobs(*)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    results = []
    for row in r.data or []:
        item = dict(row)
        item["job"] = item.pop("jobs", None)
        results.append(item)

    return results


def is_favorite(user_id: str, job_id: int) -> bool:
    """Verifie si une offre est en favori."""

    r = (
        supabase.table(TABLE)
        .select("id")
        .eq("user_id", user_id)
        .eq("job_id", job_id)
        .maybe_single()
        .execute()
    )
    return bool(r and r.data)
