"""
Scraper Benin-Digital.com — ESN tech (Bénin/International).

Site : https://benin-digital.com/emplois/
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class BeninDigitalScraper(BaseScraper):
    """Bénin Digital — Offres tech."""

    name = "Benin Digital"
    base_url = "https://benin-digital.com"
    country = "Benin"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        jobs = []
        seen_urls = set()

        # Pages à parcourir (pagination)
        pages = [
            f"{self.base_url}/emplois/",
            f"{self.base_url}/emplois/page/2/",
            f"{self.base_url}/emplois/page/3/",
        ]

        for url in pages:
            try:
                html = self.scraper.fetch(url)
            except Exception as e:
                self.logger.warning(f"Impossible de charger {url} : {e}")
                continue

            soup = self.scraper.parse(html)

            # Récupère tous les liens vers /emplois/xxx/
            for link in soup.select('a[href*="/emplois/"]'):
                titre = link.get_text(strip=True)
                href = link.get("href")

                if not titre or not href:
                    continue

                # Filtre : ignore "Apply Now" et autres textes non-titres
                if titre.lower() in ("apply now", "apply", "voir", "lire la suite"):
                    continue

                if len(titre) < 10:
                    continue

                # Ignore la page liste elle-même
                if href.rstrip("/").endswith("/emplois"):
                    continue

                full_url = self.scraper.absolute_url(self.base_url, href)
                if not full_url or full_url in seen_urls:
                    continue

                seen_urls.add(full_url)

                jobs.append(
                    make_job(
                        titre=titre,
                        url=full_url,
                        source="Benin Digital",
                        entreprise="Benin Digital",
                        pays="Benin",
                        categorie="Informatique",
                        teletravail=False,
                    )
                )

        self.logger.info(f"Benin Digital : {len(jobs)} offres collectées")
        return jobs