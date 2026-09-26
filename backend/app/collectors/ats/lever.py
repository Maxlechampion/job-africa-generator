"""
Collecteur Lever — API publique.

API : https://api.lever.co/v0/postings/{company}?mode=json
Aucune cle requise. Retourne du JSON structure.

Reference : https://github.com/lever/postings-api
"""

import httpx

from app.collectors.ats.base_ats import BaseATSCollector
from app.services.normalizer import clean_text, parse_date


class LeverCollector(BaseATSCollector):
    """
    Collecteur pour les entreprises utilisant Lever.

    Attributs :
        company     : Slug de l'entreprise (ex: "paystack")
        source_name : Nom affiche
        country     : Pays par defaut
    """

    def __init__(
        self,
        company: str,
        source_name: str,
        country: str | None = None,
    ):
        super().__init__()

        self.company = company
        self.source_name = source_name
        self.country = country
        self.name = source_name
        self.ats_type = "lever"

        self.api_url = f"https://api.lever.co/v0/postings/{company}?mode=json"

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Lever."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        try:
            with httpx.Client(timeout=20, follow_redirects=True) as client:
                response = client.get(self.api_url, headers=headers)

                if response.status_code != 200:
                    self.logger.warning(
                        f"Lever {self.company} : HTTP {response.status_code}"
                    )
                    return []

                data = response.json()

        except Exception as e:
            self.logger.error(f"Erreur Lever {self.company} : {e}")
            return []

        if not isinstance(data, list):
            self.logger.warning(
                f"Lever {self.company} : structure inattendue"
            )
            return []

        jobs = []

        for item in data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        self.logger.info(f"Lever {self.company} : {len(jobs)} offres")
        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Lever."""

        titre = clean_text(item.get("text"))
        if not titre:
            return None

        url = item.get("hostedUrl") or item.get("applyUrl")
        if not url:
            return None

        # Localisation
        categories = item.get("categories") or {}
        location = clean_text(categories.get("location"))
        team = clean_text(categories.get("team"))
        commitment = clean_text(categories.get("commitment"))

        # Teletravail
        teletravail = False
        if location and "remote" in location.lower():
            teletravail = True

        # Timestamp en millisecondes -> ISO
        created_at = item.get("createdAt")
        date_pub = None
        if created_at:
            try:
                from datetime import datetime, timezone
                date_pub = datetime.fromtimestamp(
                    created_at / 1000, tz=timezone.utc
                ).isoformat()
            except Exception:
                pass

        return {
            "titre": titre,
            "entreprise": self.source_name,
            "pays": self.country,
            "ville": location,
            "description": clean_text(item.get("descriptionPlain")),
            "type_contrat": commitment,
            "niveau": None,
            "categorie": team,
            "date_publication": date_pub,
            "date_expiration": None,
            "url": url,
            "source": f"{self.source_name} (Lever)",
            "teletravail": teletravail,
        }
