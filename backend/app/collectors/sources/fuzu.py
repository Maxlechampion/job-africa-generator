"""
Collecteur Fuzu — API officielle.

API : https://www.fuzu.com/api/all_jobs

Headers Origin/Referer requis pour eviter le 403.
"""

import httpx

from app.collectors.base import BaseCollector
from app.services.normalizer import clean_text, parse_date


class FuzuCollector(BaseCollector):
    """Fuzu — Job board panafricain (API)."""

    name = "Fuzu"
    api_url = "https://www.fuzu.com/api/all_jobs"

    def __init__(self):
        super().__init__()

    def collect(self) -> list[dict]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": "https://www.fuzu.com",
            "Referer": "https://www.fuzu.com/",
        }

        try:
            with httpx.Client(timeout=30, follow_redirects=True) as client:
                response = client.get(self.api_url, headers=headers)

                self.logger.info(
                    f"Fuzu HTTP {response.status_code} — "
                    f"{len(response.text)} car."
                )

                if response.status_code != 200:
                    self.logger.warning(
                        f"Fuzu repond {response.status_code}"
                    )
                    return []

                data = response.json()

        except Exception as e:
            self.logger.error(f"Erreur API Fuzu : {e}")
            return []

        # ==================== Analyse de la structure ====================
        jobs_data = []

        if isinstance(data, dict):
            # Cherche une cle contenant une liste
            for key in ("fuzu_api", "jobs", "data", "results", "items", "all_jobs"):
                value = data.get(key)
                if isinstance(value, list):
                    jobs_data = value
                    self.logger.info(f"Fuzu : cle '{key}' -> {len(value)} elements")
                    break

            if not jobs_data:
                self.logger.warning(
                    f"Fuzu : structure inattendue. Cles : {list(data.keys())[:10]}"
                )
        elif isinstance(data, list):
            jobs_data = data
            self.logger.info(f"Fuzu : liste directe -> {len(data)} elements")

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        self.logger.info(f"Fuzu : {len(jobs)} offres parsees")
        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Fuzu avec differents formats de cles."""

        if not isinstance(item, dict):
            return None

        # Le titre peut etre Title, title, job_title
        titre = clean_text(
            item.get("Title") or item.get("title") or item.get("job_title")
        )
        if not titre:
            return None

        # URL
        url = (
            item.get("URL")
            or item.get("url")
            or item.get("job_url")
            or item.get("link")
        )

        if not url and item.get("slug"):
            url = f"https://www.fuzu.com/job/{item['slug']}"

        if not url:
            return None

        # Pays
        pays = clean_text(
            item.get("Country") or item.get("country") or item.get("location")
        )

        # Code pays
        country_code = item.get("Country_code") or item.get("country_code")
        if country_code:
            mapping = {
                "KE": "Kenya",
                "NG": "Nigeria",
                "UG": "Uganda",
                "GH": "Ghana",
                "TZ": "Tanzanie",
                "RW": "Rwanda",
                "MW": "Malawi",
            }
            pays = mapping.get(country_code.upper(), pays)

        return {
            "titre": titre,
            "entreprise": clean_text(
                item.get("Employer_name")
                or item.get("employer_name")
                or item.get("company")
            ),
            "pays": pays,
            "ville": clean_text(item.get("Location") or item.get("city")),
            "description": clean_text(
                item.get("Description") or item.get("description")
            ),
            "type_contrat": None,
            "niveau": item.get("Job_level") or item.get("job_level"),
            "categorie": None,
            "date_publication": parse_date(
                item.get("Campaign_start_date")
                or item.get("created_at")
                or item.get("date_posted")
            ),
            "date_expiration": parse_date(
                item.get("Campaign_end_date") or item.get("expires_at")
            ),
            "url": url,
            "source": "Fuzu",
            "teletravail": bool(item.get("is_remote", False)),
        }
