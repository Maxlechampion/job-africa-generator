"""
Normalisation des données d'offres d'emploi.

Fonctions :
    - clean_text : nettoie un texte (HTML, espaces)
    - detect_pays : détecte le pays depuis le texte
    - normalize_url : nettoie une URL (retire tracking)
    - parse_date : convertit une date en ISO 8601
    - normalize_job : normalise une offre complète
    - job_fingerprint : empreinte pour la déduplication
"""

import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, urlunparse

from slugify import slugify


# ==================== Mapping pays ====================
PAYS_AFRIQUE_OUEST = {
    "benin": "Bénin",
    "bénin": "Bénin",
    "togo": "Togo",
    "cote d'ivoire": "Côte d'Ivoire",
    "côte d'ivoire": "Côte d'Ivoire",
    "ivory coast": "Côte d'Ivoire",
    "senegal": "Sénégal",
    "sénégal": "Sénégal",
    "burkina faso": "Burkina Faso",
    "burkina": "Burkina Faso",
    "mali": "Mali",
    "niger": "Niger",
    "guinee": "Guinée",
    "guinée": "Guinée",
    "ghana": "Ghana",
    "nigeria": "Nigeria",
}


def clean_text(value: Optional[str]) -> Optional[str]:
    """
    Nettoie un texte :
    - supprime les balises HTML
    - supprime les caractères de contrôle
    - normalise les espaces

    Args:
        value: Texte à nettoyer

    Returns:
        Texte nettoyé ou None
    """

    if not value:
        return None

    # Supprime les balises HTML
    value = re.sub(r"<[^>]+>", " ", value)

    # Supprime les caractères de contrôle
    value = re.sub(r"[\x00-\x1f\x7f]", " ", value)

    # Normalise les espaces multiples
    value = " ".join(value.split())

    return value.strip() or None


def detect_pays(text: Optional[str]) -> Optional[str]:
    """
    Détecte le pays à partir d'un texte.

    Args:
        text: Texte à analyser

    Returns:
        Nom du pays normalisé ou None
    """

    if not text:
        return None

    text_lower = text.lower()

    for key, pays in PAYS_AFRIQUE_OUEST.items():
        if key in text_lower:
            return pays

    return None


def normalize_url(url: Optional[str]) -> Optional[str]:
    """
    Nettoie une URL :
    - retire les paramètres de tracking (utm_, fbclid, gclid)
    - retire le fragment
    - met le domaine en minuscules

    Args:
        url: URL à nettoyer

    Returns:
        URL nettoyée ou None
    """

    if not url:
        return None

    try:
        parsed = urlparse(str(url))

        # Filtre les paramètres de tracking
        query_parts = []
        if parsed.query:
            for part in parsed.query.split("&"):
                if not part.startswith(("utm_", "fbclid", "gclid")):
                    query_parts.append(part)

        return urlunparse((
            parsed.scheme,
            parsed.netloc.lower(),
            parsed.path.rstrip("/"),
            "",
            "&".join(query_parts),
            "",
        ))

    except Exception:
        return url


def parse_date(value) -> Optional[str]:
    """
    Convertit une date en ISO 8601.

    Supporte :
    - datetime Python
    - RFC 2822 (feedparser)
    - Formats courants (YYYY-MM-DD, DD/MM/YYYY, etc.)

    Args:
        value: Date à convertir

    Returns:
        Date ISO 8601 ou None
    """

    if not value:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, str):
        # Essaie le format RFC 2822 (utilisé par RSS)
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(value).isoformat()
        except Exception:
            pass

        # Essaie les formats courants
        for fmt in (
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
        ):
            try:
                return datetime.strptime(value, fmt).isoformat()
            except ValueError:
                continue

    return None


def normalize_job(job: dict) -> dict:
    """
    Normalise une offre d'emploi.

    Args:
        job: Offre brute

    Returns:
        Offre normalisée
    """

    titre = clean_text(job.get("titre")) or "Offre sans titre"
    description = clean_text(job.get("description"))

    # Détecte le pays si non fourni
    pays = clean_text(job.get("pays"))
    if not pays:
        pays = detect_pays(f"{titre} {description or ''}")

    return {
        "titre": titre[:300],
        "entreprise": clean_text(job.get("entreprise")),
        "pays": pays,
        "ville": clean_text(job.get("ville")),
        "description": description,
        "type_contrat": clean_text(job.get("type_contrat")),
        "niveau": clean_text(job.get("niveau")),
        "categorie": clean_text(job.get("categorie")),
        "date_publication": parse_date(job.get("date_publication")),
        "date_expiration": parse_date(job.get("date_expiration")),
        "url": normalize_url(job.get("url")),
        "source": clean_text(job.get("source")) or "Inconnu",
        "teletravail": bool(job.get("teletravail", False)),
    }


def job_fingerprint(job: dict) -> str:
    """
    Génère une empreinte pour la déduplication.

    Args:
        job: Offre normalisée

    Returns:
        Empreinte au format "titre|entreprise|ville"
    """

    parts = [
        slugify(job.get("titre") or ""),
        slugify(job.get("entreprise") or ""),
        slugify(job.get("ville") or ""),
    ]

    return "|".join(p for p in parts if p)
