"""
Routes API pour les offres premium.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.services.payment_service import create_transaction
from app.services.premium_service import is_premium_user


router = APIRouter(prefix="/premium", tags=["premium"])


@router.get("/status")
def status(user=Depends(get_current_user)):
    """Statut premium de l'utilisateur."""
    return {"is_premium": is_premium_user(user["id"])}


@router.post("/jobs/{job_id}/boost")
def boost_job(job_id: int, user=Depends(get_current_user)):
    """
    Met en avant une offre (premium).

    Utilise use_admin=True pour bypasser RLS.
    """

    transaction = create_transaction(
        user_id=user["id"],
        type="premium_job",
        metadata={"job_id": job_id},
        use_admin=True,
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
        "message": "Transaction creee - en attente de paiement",
    }
