"""
Collecteur ProGigFinder.

API : https://www.progigfinder.com/api/feed/jobs?format=json
Aucune cle requise. Retourne du JSON structure.

Champs disponibles :
    id, title, company, location, country, city,
    is_remote, job_type, category, experience_level,
    salary, description
"""

import httpx

from app.collectors.api.base_api import BaseAPICollector
from app.services.normalizer import clean_text

# ==================== Mapping type de contrat ====================
JOB_TYPE_MAP = {
    "full_time": "CDI",
    "part_time": "Temps partiel",
    "contract": "CDD",
    "temporary": "CDD",
    "internship": "Stage",
    "freelance": "Freelance",
    "volunteer": "Bénévolat",
}


# ==================== Mapping niveau ====================
EXPERIENCE_MAP = {
    "entry": "Junior",
    "junior": "Junior",
    "mid": "Mid",
    "mid_level": "Mid",
    "senior": "Senior",
    "lead": "Senior",
    "executive": "Senior",
    "director": "Senior",
}


class ProGigFinderCollector(BaseAPICollector):
    """
    Collecteur ProGigFinder (Afrique).

    Retourne des offres d'Afrique (Uganda, Kenya, Nigeria, Ghana,
    Afrique du Sud, et 30+ autres pays).
    """

    name = "ProGigFinder"
    api_url = "https://www.progigfinder.com/api/feed/jobs?format=json"

    def __init__(self):
        super().__init__()

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API ProGigFinder."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.get(self.api_url, headers=headers)
            response.raise_for_status()
            data = response.json()

        # La structure peut etre :
        # - Une liste directe
        # - Un dict avec une cle "jobs" ou "data"
        if isinstance(data, list):
            jobs_data = data
        elif isinstance(data, dict):
            jobs_data = data.get("jobs") or data.get("data") or data.get("results") or []
        else:
            jobs_data = []

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre ProGigFinder."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        # Construit une URL canonique a partir de l'ID
        job_id = item.get("id")
        url = f"https://www.progigfinder.com/jobs/{job_id}" if job_id else None

        if not url:
            return None

        # Type de contrat
        job_type = (item.get("job_type") or "").lower().strip()
        type_contrat = JOB_TYPE_MAP.get(job_type)

        # Niveau
        exp_level = (item.get("experience_level") or "").lower().strip()
        niveau = EXPERIENCE_MAP.get(exp_level)

        # Teletravail
        teletravail = bool(item.get("is_remote", False))

        return {
            "titre": titre,
            "entreprise": clean_text(item.get("company")),
            "pays": clean_text(item.get("country")),
            "ville": clean_text(item.get("city")),
            "description": clean_text(item.get("description")),
            "type_contrat": type_contrat,
            "niveau": niveau,
            "categorie": clean_text(item.get("category")),
            "date_publication": None,
            "date_expiration": None,
            "url": url,
            "source": "ProGigFinder",
            "teletravail": teletravail,
        }
