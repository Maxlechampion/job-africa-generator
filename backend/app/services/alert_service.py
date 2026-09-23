"""
Service de gestion des alertes.
"""

from app.core.logger import get_logger
from app.core.supabase import supabase
from app.services.job_service import get_jobs

logger = get_logger(__name__)
TABLE = "alerts"


def create_alert(user_id: str, data: dict) -> dict:
    """Cree une alerte."""
    payload = {"user_id": user_id, **data}
    r = supabase.table(TABLE).insert(payload).execute()
    return r.data[0] if r.data else {}


def update_alert(user_id: str, alert_id: int, data: dict) -> dict:
    """Met a jour une alerte."""
    r = supabase.table(TABLE).update(data).eq("id", alert_id).eq("user_id", user_id).execute()
    return r.data[0] if r.data else {}


def delete_alert(user_id: str, alert_id: int):
    """Supprime une alerte."""
    supabase.table(TABLE).delete().eq("id", alert_id).eq("user_id", user_id).execute()


def get_alerts(user_id: str) -> list[dict]:
    """Alertes d'un utilisateur."""
    return (
        supabase.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )


def match_jobs_for_alert(alert: dict) -> list[dict]:
    """Retourne les offres qui matchent une alerte."""

    filters = {
        "limit": 50,
        "q": alert.get("mots_cles"),
        "pays": alert.get("pays"),
        "ville": alert.get("ville"),
        "categorie": alert.get("categorie"),
        "type_contrat": alert.get("type_contrat"),
        "teletravail": alert.get("teletravail"),
    }

    filters = {k: v for k, v in filters.items() if v is not None}

    return get_jobs(**filters).get("results", [])
