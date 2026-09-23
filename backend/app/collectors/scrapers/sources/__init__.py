"""
Sources concretes de scraping HTML.

Chaque fichier contient un scraper pour un site specifique.
"""

from app.collectors.scrapers.sources.benin_webtv import BeninWebTVScraper
from app.collectors.scrapers.sources.cfao import CFAOScraper
from app.collectors.scrapers.sources.flutterwave import FlutterwaveScraper
from app.collectors.scrapers.sources.kuda import KudaScraper
from app.collectors.scrapers.sources.myjobmag import MyJobMagScraper
from app.collectors.scrapers.sources.paystack import PaystackScraper

ALL_SCRAPER_SOURCES = [
    FlutterwaveScraper,
    PaystackScraper,
    KudaScraper,
    CFAOScraper,
    MyJobMagScraper,
    BeninWebTVScraper,
]


def get_scraper_sources_summary() -> list[dict]:
    """Retourne un resume des scrapers configures."""
    summary = []

    for ScraperClass in ALL_SCRAPER_SOURCES:
        try:
            scraper = ScraperClass()
            summary.append(
                {
                    "name": scraper.name,
                    "base_url": getattr(scraper, "base_url", None),
                    "country": getattr(scraper, "country", None),
                    "type": "html",
                    "status": "active",
                }
            )
        except Exception as e:
            summary.append(
                {
                    "name": ScraperClass.__name__,
                    "error": str(e),
                    "status": "error",
                }
            )

    return summary
