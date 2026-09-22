"""
Routes API pour les favoris.

⚠️ Necessite une authentification (module 11).
Pour l'instant, utilise un user_id fictif pour tester.
"""

from fastapi import APIRouter, HTTPException, Header

from app.schemas.favorite import FavoriteCreate
from app.services.favorite_service import (
    add_favorite,
    get_favorites,
    is_favorite,
    remove_favorite,
)


router = APIRouter(prefix="/favorites", tags=["favorites"])


def get_user_id(x_user_id: str | None = Header(None)) -> str:
    """Recupere l'utilisateur (temporaire sans auth)."""

    if not x_user_id:
        raise HTTPException(401, "Header X-User-Id requis (auth a venir)")

    return x_user_id


@router.get("")
def list_favorites(user_id: str = Header(..., alias="X-User-Id")):
    """Favoris de l'utilisateur."""
    return get_favorites(user_id)


@router.post("", status_code=201)
def create_favorite(
    payload: FavoriteCreate,
    user_id: str = Header(..., alias="X-User-Id"),
):
    """Ajoute un favori."""
    return add_favorite(user_id, payload.job_id, payload.note)


@router.delete("/{job_id}", status_code=204)
def delete_favorite(
    job_id: int,
    user_id: str = Header(..., alias="X-User-Id"),
):
    """Supprime un favori."""
    remove_favorite(user_id, job_id)
    return None


@router.get("/check/{job_id}")
def check_favorite(
    job_id: int,
    user_id: str = Header(..., alias="X-User-Id"),
):
    """Verifie si une offre est en favori."""
    return {"is_favorite": is_favorite(user_id, job_id)}
