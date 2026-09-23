"""
Scraper Benin Web TV - Offres d'emploi au Benin.

Site : https://beninwebtv.bj/emploi-benin/
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class BeninWebTVScraper(BaseScraper):
    """Benin Web TV - Actualites et opportunites (Benin)."""

    name = "Benin Web TV"
    base_url = "https://beninwebtv.bj"
    country = "Benin"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        url = f"{self.base_url}/emploi-benin/"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for article in soup.select("article, .post, .entry"):
            titre_el = article.select_one("h2 a, h3 a, .entry-title a")
            if not titre_el:
                continue

            titre = titre_el.get_text(strip=True)
            href = titre_el.get("href")

            if not titre or not href:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(
                make_job(
                    titre=titre,
                    url=full_url,
                    source="Benin Web TV",
                    pays="Benin",
                )
            )

        return jobs
