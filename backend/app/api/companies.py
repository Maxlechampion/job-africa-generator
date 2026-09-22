"""
Routes API pour les entreprises.
"""

from fastapi import APIRouter, HTTPException

from app.services.company_service import get_companies, get_company


router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("")
def list_companies(limit: int = 100):
    """Liste des entreprises."""
    return get_companies(limit)


@router.get("/{company_id}")
def find_company(company_id: int):
    """Recupere une entreprise."""
    c = get_company(company_id)
    if not c:
        raise HTTPException(404, "Entreprise introuvable")
    return c
