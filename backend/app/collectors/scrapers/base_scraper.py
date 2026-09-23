"""
Classe de base pour tous les scrapers HTML.
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseScraper(ABC):
    """
    Classe abstraite pour les scrapers HTML.

    Attributs a definir :
        name        : Nom de la source
        base_url    : URL de base du site
        country     : Pays par defaut
        categorie   : Categorie par defaut
    """

    name: str = "base_scraper"
    base_url: str = ""
    country: str | None = None
    categorie: str | None = None

    def __init__(self):
        self.logger = get_logger(f"scraper.{self.name}")

    @abstractmethod
    def collect(self) -> list[dict]:
        """Recupere les offres depuis le site."""

    def safe_collect(self) -> list[dict]:
        """Wrapper avec gestion d'erreur."""

        try:
            self.logger.info(f"Scraping : {self.name}")
            jobs = self.collect()
            self.logger.info(f"{len(jobs)} offre(s) depuis {self.name}")
            return jobs

        except Exception as e:
            self.logger.error(f"Erreur scraping {self.name} : {e}")
            return []
