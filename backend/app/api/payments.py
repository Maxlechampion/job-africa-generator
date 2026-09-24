from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.payments import TARIFS, MOYENS_PAR_PAYS, PAYMENT_PROVIDER
from app.services.payment_service import (
    create_transaction,
    get_user_transactions,
    get_revenue_stats,
)


router = APIRouter(prefix="/payments", tags=["payments"])


class InitiatePaymentRequest(BaseModel):
    type: str
    metadata: Optional[dict] = None


def get_access_token(authorization: str = Header(...)) -> str:
    """Extrait le token Bearer du header Authorization."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Format de token invalide")
    return authorization[7:]  # Enlève "Bearer "


@router.post("/initiate")
def initiate_payment(
    payload: InitiatePaymentRequest,
    user=Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    """Cree une transaction en attente."""

    if payload.type not in TARIFS:
        raise HTTPException(400, f"Type de paiement inconnu : {payload.type}")

    transaction = create_transaction(
        user_id=user["id"],
        type=payload.type,
        metadata=payload.metadata or {},
        access_token=token,  # ← Passe le token
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
        "devise": transaction["devise"],
        "provider": transaction["provider"],
        "statut": transaction["statut"],
    }