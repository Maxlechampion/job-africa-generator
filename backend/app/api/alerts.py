"""
Routes API pour les alertes.

⚠️ Necessite une authentification (module 11).
"""

from fastapi import APIRouter, Header

from app.schemas.alert import AlertCreate, AlertUpdate
from app.services.alert_service import (
    create_alert,
    delete_alert,
    get_alerts,
    update_alert,
)


router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def list_alerts(user_id: str = Header(..., alias="X-User-Id")):
    """Alertes de l'utilisateur."""
    return get_alerts(user_id)


@router.post("", status_code=201)
def create(
    payload: AlertCreate,
    user_id: str = Header(..., alias="X-User-Id"),
):
    """Cree une alerte."""
    return create_alert(user_id, payload.model_dump())


@router.patch("/{alert_id}")
def update(
    alert_id: int,
    payload: AlertUpdate,
    user_id: str = Header(..., alias="X-User-Id"),
):
    """Met a jour une alerte."""
    return update_alert(user_id, alert_id, payload.model_dump(exclude_unset=True))


@router.delete("/{alert_id}", status_code=204)
def remove(
    alert_id: int,
    user_id: str = Header(..., alias="X-User-Id"),
):
    """Supprime une alerte."""
    delete_alert(user_id, alert_id)
    return None
