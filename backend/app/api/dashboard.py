"""
Routes API pour le dashboard admin.
"""

from fastapi import APIRouter

from app.services.dashboard_service import (
    get_daily_counts,
    get_dashboard,
    get_kpi,
    get_recent_logs,
    get_sources_status,
    get_top_pays,
    get_top_skills,
)

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("")
def dashboard():
    """Dashboard complet."""
    return get_dashboard()


@router.get("/kpi")
def kpi():
    return get_kpi()


@router.get("/daily")
def daily(days: int = 30):
    return get_daily_counts(days)


@router.get("/top-skills")
def top_skills(limit: int = 15):
    return get_top_skills(limit)


@router.get("/top-pays")
def top_pays(limit: int = 10):
    return get_top_pays(limit)


@router.get("/sources")
def sources():
    return get_sources_status()


@router.get("/logs")
def logs(limit: int = 20):
    return get_recent_logs(limit)
