"""
Scraper EmploiRapide.Net — Cote d'Ivoire / Afrique francophone.

Site : https://emploirapide.net

Le scraper teste plusieurs selecteurs et log ceux qui fonctionnent.
"""

import re

from app.collectors.scrapers.base_scraper import BaseScraper
from app.collectors.scrapers.html_scraper import HTMLScraper, make_job


class EmploiRapideScraper(BaseScraper):
    """EmploiRapide.Net — Agregateur (Cote d'Ivoire)."""

    name = "EmploiRapide"
    base_url = "https://emploirapide.net"
    country = "Cote d'Ivoire"

    def __init__(self):
        super().__init__()
        self.scraper = HTMLScraper()

    def collect(self) -> list[dict]:
        jobs = []
        seen_urls = set()

        # Pages a essayer
        pages = [
            f"{self.base_url}/",
            f"{self.base_url}/offres",
            f"{self.base_url}/emplois",
            f"{self.base_url}/jobs",
            f"{self.base_url}/annonces",
        ]

        working_page = None

        for url in pages:
            try:
                html = self.scraper.fetch(url, timeout=30)
                if len(html) > 5000:
                    self.logger.info(
                        f"EmploiRapide : page valide {url} ({len(html)} car.)"
                    )
                    working_page = (url, html)
                    break
            except Exception as e:
                self.logger.debug(f"Page invalide {url} : {e}")
                continue

        if not working_page:
            self.logger.warning("EmploiRapide : aucune page accessible")
            return []

        url, html = working_page
        soup = self.scraper.parse(html)

        # ==================== Diagnostic ====================
        self.logger.info("EmploiRapide : diagnostic des selecteurs")
        for sel in ['article', '.job', '.emploi', '.offre', 'li a', 'h2 a', 'h3 a']:
            elems = soup.select(sel)
            if elems:
                self.logger.info(f"  {sel} : {len(elems)} elements")

        # ==================== Extraction ====================
        # Cherche tous les liens qui ressemblent a une offre
        links = soup.select('a[href]')

        for link in links:
            href = link.get("href", "")
            titre = link.get_text(strip=True)

            if not titre or not href or len(titre) < 10:
                continue

            # Filtre : URL doit contenir un mot-cle d'offre
            keywords = ["/offre", "/emploi", "/job", "/annonce", "/poste"]
            if not any(k in href.lower() for k in keywords):
                continue

            # Rejette les liens de navigation
            nav_words = ["accueil", "home", "contact", "about", "login", "register"]
            if any(w in href.lower() for w in nav_words):
                continue

            # Rejette les titres trop courts ou trop generiques
            if titre.lower() in ("voir plus", "lire la suite", "details", "postuler"):
                continue

            full_url = self.scraper.absolute_url(self.base_url, href)
            if not full_url or full_url in seen_urls:
                continue

            seen_urls.add(full_url)

            jobs.append(
                make_job(
                    titre=titre,
                    url=full_url,
                    source="EmploiRapide",
                    pays="Cote d'Ivoire",
                )
            )

        self.logger.info(f"EmploiRapide : {len(jobs)} offres collectees")
        return jobs
