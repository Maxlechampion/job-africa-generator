"""
Scraper Paystack - Fintech nigeriane.

Site : https://paystack.com/careers
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class PaystackScraper(BaseScraper):
    """Paystack - Fintech paiements (Nigeria)."""

    name = "Paystack"
    base_url = "https://paystack.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        url = f"{self.base_url}/careers"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["job", "career", "position", "role"]):
                continue

            titre = link.get_text(strip=True)
            if not titre or len(titre) < 3:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(make_job(
                titre=titre,
                url=full_url,
                source="Paystack",
                entreprise="Paystack",
                pays="Nigeria",
            ))

        return jobs
