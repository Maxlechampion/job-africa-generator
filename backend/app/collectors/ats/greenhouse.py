"""
Collecteur Greenhouse.

API publique : https://boards-api.greenhouse.io/v1/boards/{token}/jobs
Aucune cle requise.

Reference : https://developers.greenhouse.io/job-board.html
"""

import httpx

from app.collectors.ats.base_ats import BaseATSCollector
from app.services.normalizer import clean_text, parse_date


class GreenhouseCollector(BaseATSCollector):
    """
    Collecteur pour les entreprises utilisant Greenhouse.

    Attributs :
        token       : Token du board (ex: "moniepoint")
        source_name : Nom affiche de la source
        country     : Pays par defaut (optionnel)
    """

    def __init__(
        self,
        token: str,
        source_name: str,
        country: str | None = None,
    ):
        super().__init__()

        self.token = token
        self.source_name = source_name
        self.country = country
        self.name = source_name
        self.ats_type = "greenhouse"

        self.api_url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Greenhouse."""

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
        """Parse une offre Greenhouse."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        url = item.get("absolute_url")
        if not url:
            return None

        location = item.get("location") or {}
        location_name = location.get("name") if isinstance(location, dict) else None

        teletravail = False
        if location_name:
            location_lower = location_name.lower()
            teletravail = any(
                kw in location_lower for kw in ["remote", "anywhere", "teletravail", "distanciel"]
            )

        updated = item.get("updated_at") or item.get("first_published")

        return {
            "titre": titre,
            "entreprise": self.source_name,
            "pays": self.country,
            "ville": location_name,
            "description": None,
            "type_contrat": None,
            "niveau": None,
            "categorie": None,
            "date_publication": parse_date(updated),
            "date_expiration": None,
            "url": url,
            "source": f"{self.source_name} (Greenhouse)",
            "teletravail": teletravail,
        }
