"""
Scraper HTML generique avec BeautifulSoup.

Utilise httpx + BeautifulSoup pour extraire les offres
depuis une page HTML statique.
"""

import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from app.services.normalizer import clean_text, parse_date


# ==================== Configuration ====================
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_TIMEOUT = 20


class HTMLScraper:
    """
    Scraper HTML generique.

    Fournit des methodes utilitaires pour scraper
    une page et extraire les offres selon des selecteurs CSS.
    """

    def __init__(self):
        pass

    def fetch(self, url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
        """
        Telecharge une page HTML avec des headers realistes.

        Args:
            url     : URL a telecharger
            timeout : Timeout en secondes

        Returns:
            Contenu HTML (string)
        """

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;"
                "q=0.9,image/avif,image/webp,*/*;q=0.8"
            ),
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }

        with httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.text

    @staticmethod
    def parse(html: str) -> BeautifulSoup:
        """Parse le HTML avec BeautifulSoup."""
        return BeautifulSoup(html, "lxml")

    @staticmethod
    def select_items(soup, selector: str) -> list:
        """Selectionne les elements correspondant au selecteur CSS."""
        return soup.select(selector)

    @staticmethod
    def extract_text(element, selector: str | None = None) -> str | None:
        """Extrait le texte d'un element (ou d'un sous-element)."""

        if element is None:
            return None

        target = element.select_one(selector) if selector else element
        if target is None:
            return None

        return clean_text(target.get_text(strip=True))

    @staticmethod
    def extract_attr(element, selector: str, attr: str = "href") -> str | None:
        """Extrait un attribut d'un sous-element."""

        if element is None:
            return None

        target = element.select_one(selector)
        if target is None:
            return None

        return target.get(attr)

    @staticmethod
    def absolute_url(base_url: str, href: str | None) -> str | None:
        """Convertit une URL relative en URL absolue."""

        if not href:
            return None

        if href.startswith("http"):
            return href

        return urljoin(base_url, href)


def make_job(
    titre: str,
    url: str,
    source: str,
    entreprise: str | None = None,
    pays: str | None = None,
    ville: str | None = None,
    description: str | None = None,
    type_contrat: str | None = None,
    categorie: str | None = None,
    date_publication=None,
    teletravail: bool = False,
) -> dict:
    """
    Construit un dict d'offre normalise.
    """

    return {
        "titre": titre,
        "entreprise": entreprise,
        "pays": pays,
        "ville": ville,
        "description": description,
        "type_contrat": type_contrat,
        "niveau": None,
        "categorie": categorie,
        "date_publication": parse_date(date_publication),
        "date_expiration": None,
        "url": url,
        "source": source,
        "teletravail": teletravail,
    }