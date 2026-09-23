"""
Service de journalisation des collectes.

Enregistre chaque passage de collecte dans la table collect_logs
pour permettre un suivi et un debug a posteriori.
"""

from datetime import UTC, datetime, timedelta

from app.core.logger import get_logger
from app.core.supabase import supabase

logger = get_logger(__name__)

TABLE = "collect_logs"


def log_collect(
    source_nom: str,
    statut: str,
    offres_collectees: int = 0,
    offres_inserees: int = 0,
    offres_ignorees: int = 0,
    duree_secondes: float | None = None,
    erreur: str | None = None,
) -> dict | None:
    """
    Enregistre une ligne de log de collecte.
    """

    payload = {
        "source_nom": source_nom,
        "statut": statut,
        "offres_collectees": offres_collectees,
        "offres_inserees": offres_inserees,
        "offres_ignorees": offres_ignorees,
        "duree_secondes": duree_secondes,
        "erreur": erreur,
    }

    try:
        response = supabase.table(TABLE).insert(payload).execute()
        return response.data[0] if response.data else None

    except Exception as e:
        logger.error(f"Erreur ecriture log collect : {e}")
        return None


def get_logs(limit: int = 50) -> list[dict]:
    """Retourne les derniers logs de collecte."""

    try:
        response = (
            supabase.table(TABLE).select("*").order("created_at", desc=True).limit(limit).execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur lecture logs : {e}")
        return []


def get_logs_by_source(source_nom: str, limit: int = 20) -> list[dict]:
    """Retourne les derniers logs pour une source donnee."""

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .eq("source_nom", source_nom)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur lecture logs source : {e}")
        return []


def get_stats_24h() -> dict:
    """Statistiques des collectes sur les 24 dernieres heures."""

    since = (datetime.now(UTC) - timedelta(hours=24)).isoformat()

    try:
        response = supabase.table(TABLE).select("*").gte("created_at", since).execute()

        rows = response.data or []

        return {
            "periode": "24h",
            "total_collectes": len(rows),
            "total_offres_collectees": sum(r.get("offres_collectees", 0) for r in rows),
            "total_offres_inserees": sum(r.get("offres_inserees", 0) for r in rows),
            "total_erreurs": sum(1 for r in rows if r.get("statut") == "error"),
        }

    except Exception as e:
        logger.error(f"Erreur stats 24h : {e}")
        return {
            "periode": "24h",
            "total_collectes": 0,
            "total_offres_collectees": 0,
            "total_offres_inserees": 0,
            "total_erreurs": 0,
        }
