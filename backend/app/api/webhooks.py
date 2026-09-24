"""
Routes API pour les webhooks des agregateurs de paiement.
"""

from fastapi import APIRouter, Header, HTTPException, Request

from app.core.logger import get_logger
from app.services.payment_service import confirm_transaction
from app.services.kkiapay_service import (
    is_payment_successful,
    verify_webhook_signature,
)


logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/kkiapay")
async def kkiapay_webhook(
    request: Request,
    x_kkiapay_signature: str | None = Header(None),
):
    """
    Webhook KKiaPay — recoit les notifications de paiement.
    """

    body = await request.body()

    # Verifie la signature
    if x_kkiapay_signature:
        if not verify_webhook_signature(body, x_kkiapay_signature):
            logger.warning("Signature KKiaPay invalide")
            raise HTTPException(401, "Signature invalide")

    # Parse le JSON
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "JSON invalide")

    logger.info(f"Webhook KKiaPay recu : {data}")

    # Extrait la reference (notre reference JA-2026-XXXX)
    reference = (
        data.get("reference")
        or data.get("data", {}).get("reference")
        or data.get("transaction", {}).get("reference")
    )

    if not reference:
        logger.warning("Webhook KKiaPay sans reference")
        return {"status": "ignored", "reason": "no reference"}

    # Verifie le statut
    if is_payment_successful(data):
        result = confirm_transaction(reference, use_admin=True)

        if result:
            logger.info(f"Transaction {reference} confirmee via webhook")
            return {"status": "ok", "reference": reference}

        logger.warning(f"Transaction {reference} introuvable")
        return {"status": "not_found", "reference": reference}

    # Paiement echoue
    logger.info(f"Paiement KKiaPay non reussi : {data.get('status')}")
    return {"status": "ignored", "reason": data.get("status", "unknown")}


@router.get("/kkiapay/health")
def kkiapay_webhook_health():
    """Endpoint de sante pour tester le webhook."""
    return {"status": "ok", "provider": "kkiapay"}
