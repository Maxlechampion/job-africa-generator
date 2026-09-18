"""
Classe de base pour les collecteurs ATS.
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseATSCollector(ABC):
    """
    Classe abstraite pour les collecteurs ATS.

    Chaque ATS (Greenhouse, Ashby) implemente sa propre logique
    de parsing mais partage la meme interface.
    """

    name: str = "base_ats"
    ats_type: str = "ats"

    def __init__(self):
        self.logger = get_logger(f"collector.ats.{self.name}")

    @abstractmethod
    def collect(self) -> list[dict]:
        """Recupere les offres depuis l'API de l'ATS."""
        pass

    def safe_collect(self) -> list[dict]:
        """Wrapper avec gestion d'erreur."""

        try:
            self.logger.info(f"Collecte ATS : {self.name}")
            jobs = self.collect()
            self.logger.info(f"{len(jobs)} offre(s) depuis {self.name}")
            return jobs

        except Exception as e:
            self.logger.error(f"Erreur ATS {self.name} : {e}")
            return []
