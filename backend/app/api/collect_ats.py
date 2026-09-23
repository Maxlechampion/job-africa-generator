"""
Routes API pour la collecte ATS.

Separe de collect.py pour ne pas impacter les collecteurs RSS existants.
"""

from fastapi import APIRouter

from app.collectors.ats.sources import (
    ALL_ATS_SOURCES,
    get_ats_sources_summary,
)
from app.core.logger import get_logger
from app.services.job_service import bulk_create_jobs

logger = get_logger(__name__)

router = APIRouter(prefix="/collect/ats", tags=["collect-ats"])


@router.get("/sources", summary="Liste des sources ATS")
def list_ats_sources():
    """Retourne la liste des entreprises ATS configurees."""
    return get_ats_sources_summary()


@router.post("/run", summary="Lancer une collecte ATS")
def collect_ats():
    """
    Lance tous les collecteurs ATS et insere les offres en base.

    Separe de POST /admin/scheduler/trigger pour permettre
    de tester les ATS independamment des RSS.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for CollectorClass in ALL_ATS_SOURCES:
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

            logger.info(f"ATS {collector.name} : {collected} collectees, {inserted} inserees")

        except Exception as e:
            total_errors += 1
            details.append(
                {
                    "source": collector.name,
                    "status": "error",
                    "error": str(e)[:200],
                }
            )
            logger.error(f"ATS {collector.name} : {e}")

    return {
        "message": "Collecte ATS terminee",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "details": details,
    }
