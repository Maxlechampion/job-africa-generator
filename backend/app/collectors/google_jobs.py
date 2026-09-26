"""
Collecteur Google Jobs via JobSpy (gratuit).

JobSpy est une bibliotheque Python open source qui scrape
Google Jobs, LinkedIn, Indeed, Glassdoor, etc.

Repo : https://github.com/speedyapply/JobSpy

Installation :
    pip install python-jobspy
"""

from app.collectors.base import BaseCollector
from app.core.logger import get_logger


logger = get_logger(__name__)


# ==================== Configuration ====================
# Villes africaines principales
AFRICAN_LOCATIONS = [
    "Cotonou, Benin",
    "Lome, Togo",
    "Abidjan, Cote d'Ivoire",
    "Dakar, Senegal",
    "Accra, Ghana",
    "Lagos, Nigeria",
    "Bamako, Mali",
    "Ouagadougou, Burkina Faso",
    "Niamey, Niger",
    "Conakry, Guinee",
]

# Termes de recherche
SEARCH_TERMS = [
    "developer",
    "python developer",
    "data analyst",
    "marketing",
    "accountant",
    "engineer",
]


class GoogleJobsCollector(BaseCollector):
    """
    Collecteur Google Jobs via JobSpy.

    Gratuit et open source.
    """

    def __init__(
        self,
        search_terms: list[str] | None = None,
        locations: list[str] | None = None,
        results_per_query: int = 20,
    ):
        super().__init__()

        self.name = "Google Jobs"
        self.search_terms = search_terms or SEARCH_TERMS[:3]  # 3 termes par defaut
        self.locations = locations or AFRICAN_LOCATIONS[:3]  # 3 villes par defaut
        self.results_per_query = results_per_query

    def collect(self) -> list[dict]:
        """Recupere les offres via JobSpy."""

        try:
            from jobspy import scrape_jobs
        except ImportError:
            self.logger.error(
                "JobSpy non installe. Executez : pip install python-jobspy"
            )
            return []

        all_jobs = []

        for term in self.search_terms:
            for location in self.locations:
                try:
                    self.logger.info(f"Recherche : {term} a {location}")

                    jobs_df = scrape_jobs(
                        site_name=["google"],
                        search_term=term,
                        location=location,
                        results_wanted=self.results_per_query,
                        hours_old=168,
                        country_indeed="nigeria", 
                    )

                    # Convertit le DataFrame en liste
                    for _, row in jobs_df.iterrows():
                        job = self._parse_row(row, location)
                        if job:
                            all_jobs.append(job)

                except Exception as e:
                    self.logger.warning(
                        f"Erreur {term} / {location} : {e}"
                    )
                    continue

        return all_jobs

    def _parse_row(self, row, location: str) -> dict | None:
        """Parse une ligne du DataFrame JobSpy."""

        titre = str(row.get("title", "")).strip()
        if not titre:
            return None

        url = str(row.get("job_url", "")).strip()
        if not url:
            return None

        # Extrait le pays depuis la localisation
        pays = None
        if "," in location:
            pays = location.split(",")[1].strip()

        return {
            "titre": titre,
            "entreprise": str(row.get("company", "")).strip() or None,
            "pays": pays,
            "ville": str(row.get("location", "")).strip() or None,
            "description": str(row.get("description", "")).strip() or None,
            "type_contrat": str(row.get("job_type", "")).strip() or None,
            "niveau": None,
            "categorie": None,
            "date_publication": str(row.get("date_posted", "")).strip() or None,
            "date_expiration": None,
            "url": url,
            "source": f"Google Jobs ({location})",
            "teletravail": bool(row.get("is_remote", False)),
        }
