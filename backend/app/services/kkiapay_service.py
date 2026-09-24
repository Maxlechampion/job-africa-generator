"""
Service KKiaPay — Verification des transactions.

Documentation : https://docs.kkiapay.me
"""

import hmac
import hashlib

import httpx

from app.core.config import settings
from app.core.logger import get_logger
from app.core.payments import (
    KKIAPAY_PUBLIC_KEY,
    KKIAPAY_PRIVATE_KEY,
    KKIAPAY_SECRET,
    KKIAPAY_SANDBOX,
)


logger = get_logger(__name__)


def get_api_base_url() -> str:
    """Retourne l'URL de base de l'API KKiaPay."""
    if KKIAPAY_SANDBOX:
        return "https://api-sandbox.kkiapay.me"
    return "https://api.kkiapay.me"


def verify_transaction(transaction_id: str) -> dict | None:
    """
    Verifie une transaction KKiaPay via l'API.

    Args:
        transaction_id: ID de la transaction KKiaPay

    Returns:
        Dict avec les details ou None si echec
    """

    url = f"{get_api_base_url()}/api/v1/transactions/{transaction_id}"

    headers = {
        "x-public-key": KKIAPAY_PUBLIC_KEY,
        "x-private-key": KKIAPAY_PRIVATE_KEY,
        "Accept": "application/json",
    }

    try:
        with httpx.Client(timeout=15) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

            logger.info(f"Transaction KKiaPay verifiee : {transaction_id}")
            return data

    except httpx.HTTPError as e:
        logger.error(f"Erreur verification KKiaPay : {e}")
        return None


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verifie la signature d'un webhook KKiaPay.

    Args:
        payload: Corps brut de la requete
        signature: Header 'x-kkiapay-signature'

    Returns:
        True si la signature est valide
    """

    if not KKIAPAY_SECRET:
        logger.warning("KKIAPAY_SECRET manquant — signature non verifiee")
        return True

    expected = hmac.new(
        KKIAPAY_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def is_payment_successful(data: dict) -> bool:
    """Verifie si un paiement KKiaPay est reussi."""

    status = data.get("status", "").lower()
    return status in ("success", "successful", "paid", "completed")
