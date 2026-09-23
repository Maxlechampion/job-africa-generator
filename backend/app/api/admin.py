"""
Routes API admin pour le scheduler et les logs.
"""

from fastapi import APIRouter, HTTPException

from app.services.log_service import (
    get_logs,
    get_logs_by_source,
    get_stats_24h,
)
from app.services.scheduler import (
    get_scheduler_status,
    run_all_collectors,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/scheduler/status", summary="Statut du scheduler")
def scheduler_status():
    """Retourne le statut du scheduler et la liste des jobs."""
    return get_scheduler_status()


@router.post("/scheduler/trigger", summary="Declencher une collecte manuelle")
def trigger_collect():
    """
    Declenche immediatement une collecte de toutes les sources.

    ATTENTION : Cette operation peut prendre plusieurs minutes.
    """
    return run_all_collectors()


@router.get("/logs", summary="Derniers logs de collecte")
def list_logs(limit: int = 50):
    """Retourne les derniers logs de collecte."""

    if limit > 500:
        raise HTTPException(400, "Limit maximum : 500")

    return get_logs(limit)


@router.get("/logs/source/{source_nom}", summary="Logs d'une source")
def source_logs(source_nom: str, limit: int = 20):
    """Retourne les derniers logs pour une source donnee."""
    return get_logs_by_source(source_nom, limit)


@router.get("/logs/stats/24h", summary="Stats 24h")
def stats_24h():
    """Statistiques des collectes sur les 24 dernieres heures."""
    return get_stats_24h()
