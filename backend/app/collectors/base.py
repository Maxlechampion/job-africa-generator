"""
Classe de base pour tous les collecteurs.

Chaque collecteur doit hériter de BaseCollector et
implémenter la méthode collect().

Fonctionnalités :
    - safe_collect() : wrapper avec gestion d'erreur
    - Logging automatique
    - Compteur d'offres collectées
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseCollector(ABC):
    """
    Classe abstraite pour tous les collecteurs.

    Attributs à définir dans les sous-classes :
        name    : Nom de la source (ex: "Emploi Afrique")
        country : Pays ciblé (optionnel)
        pays    : Alias de country
    """

    name: str = "base"
    country: str | None = None
    pays: str | None = None

    def __init__(self):
        """Initialise le logger du collecteur."""

        self.logger = get_logger(f"collector.{self.name}")
        self.jobs_collected = 0

    @abstractmethod
    def collect(self) -> list[dict]:
        """
        Récupère des offres depuis une source.

        Doit retourner une liste de dictionnaires avec les clés :
            titre, entreprise, pays, ville, description,
            type_contrat, niveau, categorie, date_publication,
            date_expiration, url, source, teletravail

        Returns:
            Liste d'offres (dict)
        """

    def safe_collect(self) -> list[dict]:
        """
        Wrapper avec gestion d'erreur.

        Ne lève jamais d'exception : retourne une liste vide en cas d'erreur.

        Returns:
            Liste d'offres (vide si erreur)
        """

        try:
            self.logger.info(f"Démarrage de la collecte : {self.name}")

            jobs = self.collect()

            self.jobs_collected = len(jobs)

            self.logger.info(f"Collecte terminée : {len(jobs)} offre(s) depuis {self.name}")

            return jobs

        except Exception as e:
            self.logger.error(f"Erreur de collecte depuis {self.name} : {e}")
            return []
