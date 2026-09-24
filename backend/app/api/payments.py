"""
Routes API pour les paiements.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.payments import MOYENS_PAR_PAYS, PAYMENT_PROVIDER, TARIFS
from app.services.payment_service import (
    create_transaction,
    get_revenue_stats,
    get_user_transactions,
)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/tarifs")
def list_tarifs():
    """Liste des tarifs disponibles."""
    return {
        "provider": PAYMENT_PROVIDER,
        "tarifs": TARIFS,
        "moyens_par_pays": MOYENS_PAR_PAYS,
    }


from pydantic import BaseModel
from typing import Optional


class InitiatePaymentRequest(BaseModel):
    type: str
    metadata: Optional[dict] = None


@router.post("/initiate")
def initiate_payment(
    payload: InitiatePaymentRequest,
    user=Depends(get_current_user),
):
    """Cree une transaction en attente."""
    if payload.type not in TARIFS:
        raise HTTPException(400, f"Type de paiement inconnu : {payload.type}")

    transaction = create_transaction(
        user_id=user["id"],
        type=payload.type,
        metadata=payload.metadata or {},
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

@router.get("/transactions")
def my_transactions(user=Depends(get_current_user)):
    return get_user_transactions(user["id"])


@router.get("/admin/revenue")
def revenue(user=Depends(get_current_user)):
    if user.get("user_role") != "admin":
        raise HTTPException(403, "Admin requis")
    return get_revenue_stats()
