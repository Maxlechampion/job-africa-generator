"""
Routes API pour les statistiques et référentiels.
"""

from fastapi import APIRouter

from app.services.job_service import (
    get_categories,
    get_countries,
    get_sources,
    get_stats,
)


router = APIRouter(tags=["stats"])


@router.get("/stats", summary="Statistiques globales")
def stats():
    """Statistiques globales de la plateforme."""
    return get_stats()


@router.get("/countries", summary="Pays disponibles")
def countries():
    """Liste des pays ayant des offres."""
    return get_countries()


@router.get("/categories", summary="Catégories disponibles")
def categories():
    """Liste des catégories d'offres."""
    return get_categories()


@router.get("/sources", summary="Sources disponibles")
def sources():
    """Liste des sources d'offres."""
    return get_sources()
