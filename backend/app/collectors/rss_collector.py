"""
Collecteur RSS générique avec gestion d'erreur robuste.

Utilise feedparser pour parser un flux RSS et extraire
les offres d'emploi.
"""

import feedparser
import httpx

from app.collectors.base import BaseCollector
from app.services.normalizer import parse_date

# ==================== Configuration ====================
USER_AGENT = "Mozilla/5.0 (compatible; JobAfricaBot/1.0; +https://job-africa.vercel.app)"
DEFAULT_TIMEOUT = 20  # Augmenté pour les serveurs lents
MAX_ENTRIES = 100  # Limite pour éviter les flux énormes


class RSSCollector(BaseCollector):
    """
    Collecteur générique pour flux RSS.

    Attributs :
        feed_url    : URL du flux RSS
        source_name : Nom de la source (pour le champ "source")
        country     : Pays par défaut (optionnel)
        categorie   : Catégorie par défaut (optionnel)
    """

    def __init__(
        self,
        feed_url: str,
        source_name: str,
        country: str | None = None,
        categorie: str | None = None,
    ):
        super().__init__()

        self.feed_url = feed_url
        self.source_name = source_name
        self.country = country
        self.pays = country
        self.categorie = categorie

        # Le nom du collecteur est le nom de la source
        self.name = source_name

    def collect(self) -> list[dict]:
        """
        Récupère et parse le flux RSS.

        Returns:
            Liste d'offres normalisées
        """

        # ==================== Téléchargement ====================
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": ("application/rss+xml, application/atom+xml, application/xml, text/xml, */*"),
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        }

        try:
            with httpx.Client(
                timeout=DEFAULT_TIMEOUT,
                follow_redirects=True,
                headers=headers,
            ) as client:
                response = client.get(self.feed_url)
                response.raise_for_status()
                content = response.content

        except httpx.HTTPStatusError as e:
            # Statut HTTP anormal (404, 410, 403, 500...)
            raise RuntimeError(f"HTTP {e.response.status_code} pour {self.feed_url}")

        except httpx.RequestError as e:
            # Erreur réseau (DNS, timeout, connexion...)
            raise RuntimeError(f"Erreur réseau : {type(e).__name__} — {e}")

        # ==================== Parsing ====================
        feed = feedparser.parse(content)

        # Vérifie que le flux est bien formé
        if feed.bozo and not feed.entries:
            raise RuntimeError(f"Flux RSS invalide : {self.feed_url}")

        if not feed.entries:
            self.logger.warning(f"Aucune entrée dans le flux : {self.feed_url}")
            return []

        # ==================== Extraction ====================
        jobs = []

        for entry in feed.entries[:MAX_ENTRIES]:
            job = self._parse_entry(entry)
            if job:
                jobs.append(job)

        return jobs

    def _parse_entry(self, entry) -> dict | None:
        """
        Parse une entrée RSS en offre normalisée.

        Args:
            entry : Entrée feedparser

        Returns:
            Offre (dict) ou None si invalide
        """

        # Titre obligatoire
        titre = entry.get("title", "").strip()
        if not titre:
            return None

        # URL obligatoire
        url = entry.get("link", "").strip()
        if not url:
            return None

        # Description (parfois HTML)
        description = entry.get("summary") or entry.get("description") or ""

        # Date de publication
        date_pub = entry.get("published") or entry.get("updated")

        # Entreprise (parfois dans author ou tags)
        entreprise = entry.get("author") or None

        # Détecte le télétravail depuis le titre/description
        texte_complet = f"{titre} {description}".lower()
        teletravail = any(
            kw in texte_complet
            for kw in ["remote", "télétravail", "teletravail", "distanciel", "anywhere"]
        )

        return {
            "titre": titre,
            "entreprise": entreprise,
            "pays": self.country,
            "ville": None,
            "description": description,
            "type_contrat": None,
            "niveau": None,
            "categorie": self.categorie,
            "date_publication": parse_date(date_pub),
            "date_expiration": None,
            "url": url,
            "source": self.source_name,
            "teletravail": teletravail,
        }
