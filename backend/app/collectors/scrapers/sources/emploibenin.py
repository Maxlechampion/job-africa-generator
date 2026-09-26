"""
Scraper Emploibenin.com — Job board beninois.

Site : https://www.emploibenin.com

⚠️ Ce site bloque les requetes directes (403).
Le fallback Cloudflare Worker (html_scraper.py) doit etre configure
via la variable d'environnement CLOUDFLARE_PROXY_URL.
"""

import re

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class EmploibeninScraper(BaseScraper):
    """Emploibenin.com — Job board (Benin)."""

    name = "Emploibenin"
    base_url = "https://www.emploibenin.com"
    country = "Benin"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        jobs = []
        seen_urls = set()

        # Pages de recherche
        pages = [
            f"{self.base_url}/recherche-jobs-benin",
            f"{self.base_url}/recherche-jobs-benin?page=1",
            f"{self.base_url}/recherche-jobs-benin?page=2",
        ]

        for url in pages:
            try:
                html = self.scraper.fetch(url, timeout=30)
            except Exception as e:
                self.logger.warning(f"Impossible de charger {url} : {e}")
                continue

            soup = self.scraper.parse(html)

            # Cherche les liens vers /offre-emploi-benin/
            for link in soup.select('a[href*="/offre-emploi"]'):
                titre = link.get_text(strip=True)
                href = link.get("href")

                if not titre or not href or len(titre) < 10:
                    continue

                # Ignore les faux titres
                if titre.lower() in ("apply now", "postuler", "voir", "details"):
                    continue

                full_url = self.scraper.absolute_url(self.base_url, href)
                if not full_url or full_url in seen_urls:
                    continue

                seen_urls.add(full_url)

                jobs.append(
                    make_job(
                        titre=titre,
                        url=full_url,
                        source="Emploibenin",
                        pays="Benin",
                    )
                )

        self.logger.info(f"Emploibenin : {len(jobs)} offres")
        return jobs