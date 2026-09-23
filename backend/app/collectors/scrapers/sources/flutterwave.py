"""
Scraper Flutterwave - Fintech nigeriane.

Site : https://flutterwave.com/careers
"""

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class FlutterwaveScraper(BaseScraper):
    """Flutterwave - Fintech paiements (Nigeria)."""

    name = "Flutterwave"
    base_url = "https://flutterwave.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        """
        Scrape les offres de Flutterwave.

        Note : Flutterwave utilise une page /careers avec des liens
        vers un ATS interne. On scrape les liens visibles.
        """

        url = f"{self.base_url}/careers"

        try:
            html = self.scraper.fetch(url)
        except Exception as e:
            self.logger.warning(f"Impossible de charger {url} : {e}")
            return []

        soup = self.scraper.parse(html)

        # Recherche les liens d'offres (pattern commun : /careers/ ou job)
        jobs = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")

            if not any(k in href.lower() for k in ["job", "career", "position", "opening"]):
                continue

            titre = self.scraper.extract_text(link) or link.get_text(strip=True)
            if not titre or len(titre) < 3:
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url:
                continue

            # Evite les doublons
            if any(j["url"] == full_url for j in jobs):
                continue

            jobs.append(
                make_job(
                    titre=titre,
                    url=full_url,
                    source="Flutterwave",
                    entreprise="Flutterwave",
                    pays="Nigeria",
                )
            )

        return jobs
