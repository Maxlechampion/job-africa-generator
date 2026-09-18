"""
Scraper Zonemploi - Offres du Niger.

Site : https://www.zonemploi.com
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class ZonemploiScraper(BaseScraper):
    """Zonemploi - Offres du Niger."""

    name = "Zonemploi"
    base_url = "https://www.zonemploi.com"
    country = "Niger"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        try:
            html = self.scraper.fetch(self.base_url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {self.base_url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["emploi", "offre", "job", "stage"]):
                continue

            titre = link.get_text(strip=True)
            if not titre or len(titre) < 5:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Zonemploi",
                pays="Niger",
            ))

        return jobs
