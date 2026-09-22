"""
Routes API admin pour la gestion des sources.
"""

from fastapi import APIRouter

from app.services.source_service import (
    create_source,
    get_source,
    get_sources,
    update_source,
)


router = APIRouter(prefix="/admin/sources", tags=["admin-sources"])


@router.get("")
def list_sources():
    """Liste des sources."""
    return get_sources()


@router.post("", status_code=201)
def add_source(payload: dict):
    """Ajoute une source."""
    return create_source(payload)


@router.patch("/{source_id}")
def edit_source(source_id: int, payload: dict):
    """Met a jour une source."""
    return update_source(source_id, payload)
