"""
Routes API pour la collecte par scraping HTML.

Separe de collect.py et collect_ats.py pour rester isole.
"""

from fastapi import APIRouter

from app.core.logger import get_logger
from app.collectors.scrapers.sources import (
    ALL_SCRAPER_SOURCES,
    get_scraper_sources_summary,
)
from app.services.job_service import bulk_create_jobs


logger = get_logger(__name__)

router = APIRouter(prefix="/collect/scrapers", tags=["collect-scrapers"])


@router.get("/sources", summary="Liste des sources scrapers")
def list_scraper_sources():
    """Retourne la liste des sites configures pour le scraping."""
    return get_scraper_sources_summary()


@router.post("/run", summary="Lancer une collecte par scraping")
def collect_scrapers():
    """
    Lance tous les scrapers HTML et insere les offres en base.

    Separe de POST /collect/ats/run et POST /admin/scheduler/trigger.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for ScraperClass in ALL_SCRAPER_SOURCES:
        scraper = ScraperClass()

        try:
            jobs = scraper.collect()
            collected = len(jobs)

            if collected == 0:
                details.append({
                    "source": scraper.name,
                    "status": "empty",
                    "collected": 0,
                })
                continue

            result = bulk_create_jobs(jobs)

            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            details.append({
                "source": scraper.name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
            })

            logger.info(
                f"Scraper {scraper.name} : "
                f"{collected} collectees, {inserted} inserees"
            )

        except Exception as e:
            total_errors += 1
            details.append({
                "source": scraper.name,
                "status": "error",
                "error": str(e)[:200],
            })
            logger.error(f"Scraper {scraper.name} : {e}")

    return {
        "message": "Collecte scrapers terminee",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "details": details,
    }
