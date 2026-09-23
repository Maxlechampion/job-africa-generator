"""
Classe de base pour les collecteurs API.
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseAPICollector(ABC):
    """
    Classe abstraite pour les collecteurs API JSON.

    Attributs a definir :
        name        : Nom de la source
        api_url     : URL de l'API
        country     : Pays par defaut
    """

    name: str = "base_api"
    api_url: str = ""
    country: str | None = None

    def __init__(self):
        self.logger = get_logger(f"collector.api.{self.name}")

    @abstractmethod
    def collect(self) -> list[dict]:
        """Recupere les offres depuis l'API."""

    def safe_collect(self) -> list[dict]:
        """Wrapper avec gestion d'erreur."""

        try:
            self.logger.info(f"Collecte API : {self.name}")
            jobs = self.collect()
            self.logger.info(f"{len(jobs)} offre(s) depuis {self.name}")
            return jobs

        except Exception as e:
            self.logger.error(f"Erreur API {self.name} : {e}")
            return []
