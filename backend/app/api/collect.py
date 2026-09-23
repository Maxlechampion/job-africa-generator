"""
Routes API pour la collecte manuelle.

Permet de déclencher la collecte depuis toutes les sources
enregistrées et d'insérer les offres en base.
"""

from fastapi import APIRouter

from app.collectors.sources.relay_rss import ALL_SOURCES
from app.core.logger import get_logger
from app.services.job_service import bulk_create_jobs

logger = get_logger(__name__)

router = APIRouter(tags=["collect"])


@router.post("/collect", summary="Lancer une collecte manuelle")
def collect_jobs():
    """
    Lance tous les collecteurs enregistrés et insère
    les offres récupérées en base.

    Retourne un résumé par source.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0

    details = []

    # ==================== Boucle sur les sources ====================
    for CollectorClass in ALL_SOURCES:
        collector = CollectorClass()
        jobs = collector.safe_collect()

        collected = len(jobs)

        if collected == 0:
            details.append(
                {
                    "source": collector.name,
                    "collected": 0,
                    "inserted": 0,
                    "skipped": 0,
                }
            )
            continue

        # ==================== Insertion en base ====================
        result = bulk_create_jobs(jobs)

        inserted = result.get("inserted", 0)
        skipped = result.get("skipped", 0)

        total_collected += collected
        total_inserted += inserted
        total_skipped += skipped

        details.append(
            {
                "source": collector.name,
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
            }
        )

        logger.info(
            f"{collector.name} : {collected} collectées, {inserted} insérées, {skipped} ignorées"
        )

    # ==================== Résumé global ====================
    logger.info(
        f"Collecte terminée : "
        f"{total_collected} collectées, "
        f"{total_inserted} insérées, "
        f"{total_skipped} ignorées"
    )

    return {
        "message": "Collecte terminée",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "details": details,
    }


@router.get("/collect/sources", summary="Liste des sources de collecte")
def list_sources():
    """
    Retourne la liste des sources disponibles pour la collecte.
    """

    sources = []

    for CollectorClass in ALL_SOURCES:
        collector = CollectorClass()

        sources.append(
            {
                "name": collector.name,
                "country": getattr(collector, "country", None),
                "type": "rss",
            }
        )

    return sources
