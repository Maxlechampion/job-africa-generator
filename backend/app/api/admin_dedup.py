"""
Routes API admin pour la deduplication et le nettoyage.
"""

from fastapi import APIRouter, Query

from app.services.cleanup_service import (
    clean_duplicates,
    enrich_existing_jobs,
    find_duplicates,
)
from app.services.enrichment import enrich_all_jobs

router = APIRouter(prefix="/admin/dedup", tags=["admin-dedup"])


@router.get("/find", summary="Trouver les doublons (dry-run)")
def find_dup():
    """
    Trouve les doublons sans rien supprimer.

    Retourne la liste des paires (id_a_garder, id_a_supprimer).
    """

    duplicates = find_duplicates()

    return {
        "duplicates_found": len(duplicates),
        "pairs": [{"keep_id": k, "delete_id": d} for k, d in duplicates[:50]],
    }


@router.post("/clean", summary="Supprimer les doublons")
def clean(dry_run: bool = Query(False, description="Simulation sans suppression")):
    """
    Nettoie les doublons de la base.

    Args:
        dry_run : Si True, ne supprime rien
    """

    return clean_duplicates(dry_run=dry_run)


@router.post("/enrich", summary="Enrichir les offres existantes")
def enrich(limit: int = Query(5000, ge=1, le=10000)):
    """
    Enrichit les offres existantes avec :
        - categorie
        - type_contrat
        - niveau
        - teletravail
    """

    return enrich_existing_jobs(limit)


# ==================== Enrichissement ====================


@router.post("/enrich-all", summary="Enrichir toutes les offres (companies + skills)")
def enrich_all():
    """
    Enrichit toutes les offres :
        - Crée/lie les entreprises
        - Détecte/lie les compétences (basique)
        - Met à jour company_id
    """
    return enrich_all_jobs()
