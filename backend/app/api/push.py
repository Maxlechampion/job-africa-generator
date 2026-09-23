"""
Routes API pour les notifications push.
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.core.auth import get_current_user
from app.core.push import VAPID_PUBLIC_KEY
from app.services.push_service import (
    delete_subscription,
    save_subscription,
    send_push_to_user,
)


router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key")
def get_vapid_key():
    """Retourne la cle publique VAPID."""
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe(
    request: Request,
    user_agent: str | None = Header(None),
    user=Depends(get_current_user),
):
    """Enregistre une souscription push."""

    subscription = await request.json()

    if not subscription or "endpoint" not in subscription:
        raise HTTPException(400, "Souscription invalide")

    result = save_subscription(
        user_id=user["id"],
        subscription=subscription,
        user_agent=user_agent,
    )

    if not result:
        raise HTTPException(500, "Impossible d'enregistrer la souscription")

    return {"status": "ok", "subscription_id": result.get("id")}


@router.post("/unsubscribe")
async def unsubscribe(request: Request):
    """Supprime une souscription."""

    body = await request.json()
    endpoint = body.get("endpoint")

    if not endpoint:
        raise HTTPException(400, "Endpoint manquant")

    delete_subscription(endpoint)
    return {"status": "ok"}


@router.post("/test")
def test_push(user=Depends(get_current_user)):
    """Envoie une notification de test a l'utilisateur connecte."""

    result = send_push_to_user(
        user_id=user["id"],
        title="🌍 Job Africa — Test",
        body="Les notifications push fonctionnent !",
        url="https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs",
    )

    return {
        "status": "ok" if result["sent"] > 0 else "no_subscription",
        "sent": result["sent"],
        "failed": result["failed"],
    }
