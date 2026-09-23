"""
Collecteur Ashby.

API publique : https://api.ashbyhq.com/posting-api/job-board/{name}
Aucune cle requise.

Reference : https://developers.ashbyhq.com/docs/public-job-posting-api
"""

import httpx

from app.collectors.ats.base_ats import BaseATSCollector
from app.services.normalizer import clean_text, parse_date


class AshbyCollector(BaseATSCollector):
    """
    Collecteur pour les entreprises utilisant Ashby.

    Attributs :
        board_name  : Nom du board (ex: "andela")
        source_name : Nom affiche de la source
        country     : Pays par defaut (optionnel)
    """

    def __init__(
        self,
        board_name: str,
        source_name: str,
        country: str | None = None,
    ):
        super().__init__()

        self.board_name = board_name
        self.source_name = source_name
        self.country = country
        self.name = source_name
        self.ats_type = "ashby"

        self.api_url = f"https://api.ashbyhq.com/posting-api/job-board/{board_name}"

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Ashby."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        with httpx.Client(timeout=20, follow_redirects=True) as client:
            response = client.get(self.api_url, headers=headers)
            response.raise_for_status()
            data = response.json()

        jobs_data = data.get("jobs", [])

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Ashby."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        url = item.get("jobUrl") or item.get("applyUrl")
        if not url:
            return None

        location = item.get("location")
        if isinstance(location, dict):
            location = location.get("location") or location.get("name")

        teletravail = bool(item.get("isRemote", False))
        if not teletravail and location:
            location_lower = str(location).lower()
            teletravail = any(kw in location_lower for kw in ["remote", "anywhere", "teletravail"])

        published = item.get("publishedAt")

        return {
            "titre": titre,
            "entreprise": self.source_name,
            "pays": self.country,
            "ville": location if isinstance(location, str) else None,
            "description": None,
            "type_contrat": None,
            "niveau": None,
            "categorie": None,
            "date_publication": parse_date(published),
            "date_expiration": None,
            "url": url,
            "source": f"{self.source_name} (Ashby)",
            "teletravail": teletravail,
        }
