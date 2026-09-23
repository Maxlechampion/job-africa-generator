"""
Routes API pour la collecte via APIs JSON.

Separe de collect.py, collect_ats.py et collect_scrapers.py.
"""

from fastapi import APIRouter

from app.collectors.api.sources import (
    ALL_API_SOURCES,
    get_api_sources_summary,
)
from app.core.logger import get_logger
from app.services.job_service import bulk_create_jobs

logger = get_logger(__name__)

router = APIRouter(prefix="/collect/api", tags=["collect-api"])


@router.get("/sources", summary="Liste des sources API")
def list_api_sources():
    """Retourne la liste des APIs configurees."""
    return get_api_sources_summary()


@router.post("/run", summary="Lancer une collecte API")
def collect_api():
    """
    Lance tous les collecteurs API et insere les offres en base.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for CollectorClass in ALL_API_SOURCES:
        collector = CollectorClass()

        try:
            jobs = collector.collect()
            collected = len(jobs)

            if collected == 0:
                details.append(
                    {
                        "source": collector.name,
                        "status": "empty",
                        "collected": 0,
                    }
                )
                continue

            result = bulk_create_jobs(jobs)

            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            details.append(
                {
                    "source": collector.name,
                    "status": "success",
                    "collected": collected,
                    "inserted": inserted,
                    "skipped": skipped,
                }
            )

            logger.info(f"API {collector.name} : {collected} collectees, {inserted} inserees")

        except Exception as e:
            total_errors += 1
            details.append(
                {
                    "source": collector.name,
                    "status": "error",
                    "error": str(e)[:200],
                }
            )
            logger.error(f"API {collector.name} : {e}")

    return {
        "message": "Collecte API terminee",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "details": details,
    }
