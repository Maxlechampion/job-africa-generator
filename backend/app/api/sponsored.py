"""
Routes API pour les offres sponsorisees.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.services.payment_service import create_transaction
from app.services.sponsored_service import (
    create_banner,
    get_active_banners,
)


router = APIRouter(prefix="/sponsored", tags=["sponsored"])


@router.get("/banners/{placement}")
def banners(placement: str):
    """Bannieres actives pour un emplacement."""
    return get_active_banners(placement)


@router.post("/banners")
def create_banner_endpoint(
    company_id: int,
    titre: str,
    image_url: str,
    lien_url: str,
    placement: str = "home_top",
    user=Depends(get_current_user),
):
    """Cree une banniere (en attente de paiement)."""

    if user.get("user_role") != "admin":
        raise HTTPException(403, "Admin requis")

    banner = create_banner(
        company_id=company_id,
        titre=titre,
        image_url=image_url,
        lien_url=lien_url,
        placement=placement,
    )

    if not banner:
        raise HTTPException(500, "Impossible de creer la banniere")

    transaction = create_transaction(
        user_id=user["id"],
        type="banner_week",
        company_id=company_id,
        metadata={"banner_id": banner["id"]},
        use_admin=True,
    )

    return {"banner": banner, "transaction": transaction}


@router.post("/jobs/{job_id}")
def sponsor_job(
    job_id: int,
    company_id: int,
    user=Depends(get_current_user),
):
    """Sponsorise une offre."""

    transaction = create_transaction(
        user_id=user["id"],
        company_id=company_id,
        type="sponsored_job",
        metadata={"job_id": job_id},
        use_admin=True,
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
    }
