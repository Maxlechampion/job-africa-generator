"""
Scraper HTML générique.

Utilise httpx + BeautifulSoup pour extraire les offres
depuis une page HTML.

Utilisation :
    scraper = HTMLScraper(
        url="https://example.com/jobs",
        source_name="Ma Source",
        selectors={
            "item": "div.job-card",
            "titre": "h2.job-title",
            "url": "a.job-link",
            "description": "p.job-desc",
        },
        base_url="https://example.com",
    )
    jobs = scraper.safe_collect()
"""

from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.collectors.base import BaseCollector

# ==================== Configuration ====================
USER_AGENT = "Mozilla/5.0 (compatible; JobAfricaBot/1.0; +https://job-africa.vercel.app)"
DEFAULT_TIMEOUT = 15


class HTMLScraper(BaseCollector):
    """
    Scraper HTML générique.

    Attributs :
        url        : URL de la page à scraper
        source_name : Nom de la source
        selectors  : Dict de sélecteurs CSS
                     {item, titre, url, description}
        base_url   : URL de base pour les liens relatifs
        country    : Pays par défaut (optionnel)
    """

    def __init__(
        self,
        url: str,
        source_name: str,
        selectors: dict,
        base_url: str = "",
        country: str | None = None,
    ):
        super().__init__()

        self.url = url
        self.source_name = source_name
        self.selectors = selectors
        self.base_url = base_url
        self.country = country
        self.pays = country
        self.name = source_name

    def collect(self) -> list[dict]:
        """
        Récupère et parse la page HTML.

        Returns:
            Liste d'offres normalisées
        """

        # ==================== Téléchargement ====================
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        }

        with httpx.Client(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = client.get(self.url)
            response.raise_for_status()

        # ==================== Parsing ====================
        soup = BeautifulSoup(response.text, "lxml")

        items = soup.select(self.selectors["item"])

        if not items:
            self.logger.warning(
                f"Aucun élément trouvé avec le sélecteur '{self.selectors['item']}' sur {self.url}"
            )
            return []

        # ==================== Extraction ====================
        jobs = []

        for item in items:
            job = self._parse_item(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_item(self, item) -> dict | None:
        """
        Parse un élément HTML en offre normalisée.
        """

        # Titre
        titre_el = item.select_one(self.selectors.get("titre", "h2"))
        if not titre_el:
            return None

        titre = titre_el.get_text(strip=True)
        if not titre:
            return None

        # URL
        url_el = item.select_one(self.selectors.get("url", "a"))
        if not url_el:
            return None

        href = url_el.get("href", "").strip()
        if not href:
            return None

        # Résout les URLs relatives
        if href.startswith("/") and self.base_url or not href.startswith("http") and self.base_url:
            href = urljoin(self.base_url, href)

        # Description
        desc_el = item.select_one(self.selectors.get("description", "p"))
        description = desc_el.get_text(strip=True) if desc_el else None

        # Entreprise (optionnel)
        entreprise = None
        if self.selectors.get("entreprise"):
            ent_el = item.select_one(self.selectors["entreprise"])
            if ent_el:
                entreprise = ent_el.get_text(strip=True)

        return {
            "titre": titre,
            "entreprise": entreprise,
            "pays": self.country,
            "ville": None,
            "description": description,
            "type_contrat": None,
            "niveau": None,
            "categorie": None,
            "date_publication": None,
            "date_expiration": None,
            "url": href,
            "source": self.source_name,
            "teletravail": False,
        }
