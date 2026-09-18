"""
Collecteur Fuzu.

API : https://www.fuzu.com/api/all_jobs
⚠️ Retourne 403 sans proxy. Utiliser un proxy Vercel ou un User-Agent dedie.

Fuzu est present au Kenya, Ouganda, Nigeria, Ghana, Malawi.
"""

import os
import httpx

from app.collectors.api.base_api import BaseAPICollector
from app.services.normalizer import clean_text


class FuzuCollector(BaseAPICollector):
    """
    Collecteur Fuzu (Afrique de l'Est / Ouest).

    ⚠️ Necessite un proxy si 403.
    Configurer la variable d'environnement FUZU_PROXY_URL
    pour utiliser un proxy Vercel :
        FUZU_PROXY_URL=https://ton-proxy.vercel.app
    """

    name = "Fuzu"
    api_url = "https://www.fuzu.com/api/all_jobs"

    def __init__(self):
        super().__init__()

        # Proxy optionnel (Vercel, Cloudflare Worker, etc.)
        self.proxy_url = os.getenv("FUZU_PROXY_URL", "").strip()

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Fuzu."""

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
        }

        # Utilise le proxy si configure
        if self.proxy_url:
            url = f"{self.proxy_url.rstrip('/')}/{self.api_url}"
        else:
            url = self.api_url

        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

        # Fuzu retourne {"fuzu_api": [ ... ]}
        if isinstance(data, dict):
            jobs_data = data.get("fuzu_api") or data.get("jobs") or []
        elif isinstance(data, list):
            jobs_data = data
        else:
            jobs_data = []

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Fuzu."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        # URL de l'offre
        slug = item.get("slug")
        job_id = item.get("id")

        if slug:
            url = f"https://www.fuzu.com/job/{slug}"
        elif job_id:
            url = f"https://www.fuzu.com/job/{job_id}"
        else:
            return None

        # Localisation
        pays = clean_text(item.get("country"))
        ville = clean_text(item.get("city"))

        # Teletravail
        teletravail = bool(item.get("is_remote", False))

        return {
            "titre": titre,
            "entreprise": clean_text(item.get("employer_name")),
            "pays": pays,
            "ville": ville,
            "description": clean_text(item.get("description")),
            "type_contrat": clean_text(item.get("job_type")),
            "niveau": None,
            "categorie": None,
            "date_publication": item.get("created_at"),
            "date_expiration": None,
            "url": url,
            "source": "Fuzu",
            "teletravail": teletravail,
        }
