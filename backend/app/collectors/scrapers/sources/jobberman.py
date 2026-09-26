"""
Scraper Jobberman — Nigeria & Ghana.

Site : https://www.jobberman.com
URL des offres : /listings/<slug>-<id>
Structure : div avec classes flex flex-wrap col-span-1
"""

import json
import re

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class JobbermanScraper(BaseScraper):
    """Jobberman — Job board (Nigeria/Ghana)."""

    name = "Jobberman"
    base_url = "https://www.jobberman.com"
    country = "Nigeria"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        jobs = []
        seen_urls = set()

        # Pages de recherche
        pages = [
            f"{self.base_url}/jobs",
            f"{self.base_url}/jobs?page=2",
            f"{self.base_url}/jobs?page=3",
        ]

        for url in pages:
            try:
                html = self.scraper.fetch(url, timeout=30)
            except Exception as e:
                self.logger.warning(f"Impossible de charger {url} : {e}")
                continue

            soup = self.scraper.parse(html)

            # ==================== Methode 1 : JSON-LD ====================
            for script in soup.select('script[type="application/ld+json"]'):
                try:
                    data = json.loads(script.string)
                    items = data if isinstance(data, list) else [data]

                    for item in items:
                        if item.get("@type") == "JobPosting":
                            job = self._parse_ld(item)
                            if job and job["url"] not in seen_urls:
                                seen_urls.add(job["url"])
                                jobs.append(job)
                except Exception:
                    continue

            # ==================== Methode 2 : liens /listings/ ====================
            for link in soup.select('a[href*="/listings/"]'):
                titre = link.get_text(strip=True)
                href = link.get("href")

                if not titre or not href or len(titre) < 10:
                    continue

                # Ignore les faux titres (classes generiques)
                if titre.lower() in ("apply now", "apply", "view job", "voir"):
                    continue

                full_url = self.scraper.absolute_url(self.base_url, href)
                if not full_url or full_url in seen_urls:
                    continue

                # Filtre : URL doit contenir /listings/<slug>
                if not re.search(r"/listings/[a-z0-9-]+", full_url):
                    continue

                seen_urls.add(full_url)

                # Extrait le pays depuis le titre ou la page
                pays = self._detect_country(titre, full_url)

                jobs.append(
                    make_job(
                        titre=titre,
                        url=full_url,
                        source="Jobberman",
                        pays=pays,
                    )
                )

        self.logger.info(f"Jobberman : {len(jobs)} offres collectees")
        return jobs

    def _detect_country(self, titre: str, url: str) -> str:
        """Detecte le pays depuis le titre ou l'URL."""

        text = f"{titre} {url}".lower()

        if "ghana" in text or "accra" in text or "-gh-" in text:
            return "Ghana"
        if "kenya" in text or "nairobi" in text or "-ke-" in text:
            return "Kenya"

        return "Nigeria"

    def _parse_ld(self, data: dict) -> dict | None:
        """Parse un objet schema.org JobPosting."""

        try:
            titre = data.get("title", "").strip()
            if not titre or len(titre) < 10:
                return None

            url = data.get("url", "").strip()
            if not url:
                return None

            hiring_org = data.get("hiringOrganization") or {}
            entreprise = hiring_org.get("name") if isinstance(hiring_org, dict) else None

            # Localisation
            loc = data.get("jobLocation") or {}
            if isinstance(loc, list):
                loc = loc[0] if loc else {}

            address = loc.get("address") or {}
            ville = address.get("addressLocality") if isinstance(address, dict) else None
            country_code = address.get("addressCountry") if isinstance(address, dict) else None

            country_map = {"NG": "Nigeria", "GH": "Ghana", "KE": "Kenya"}
            pays = country_map.get(country_code, "Nigeria")

            return make_job(
                titre=titre,
                url=url,
                source="Jobberman",
                entreprise=entreprise,
                pays=pays,
                ville=ville,
                date_publication=data.get("datePosted"),
            )
        except Exception:
            return None
