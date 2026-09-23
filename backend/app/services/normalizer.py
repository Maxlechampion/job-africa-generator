"""
Normalisation des données d'offres d'emploi.

Fonctions :
    - clean_text : nettoie un texte (HTML, entités, espaces)
    - detect_pays : détecte le pays depuis le texte
    - normalize_url : nettoie une URL (retire tracking)
    - parse_date : convertit une date en ISO 8601
    - normalize_job : normalise une offre complète
    - job_fingerprint : empreinte pour la déduplication
"""

import html
import re
from datetime import datetime
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
    "kenya": "Kenya",
    "uganda": "Uganda",
    "tanzania": "Tanzanie",
    "rwanda": "Rwanda",
    "south africa": "Afrique du Sud",
    "afrique du sud": "Afrique du Sud",
    "egypt": "Égypte",
    "egypte": "Égypte",
}


# ==================== Mots d'article (à filtrer) ====================
MOTS_ARTICLE = [
    "mis à jour le",
    "dans cet article",
    "nous faisons le point",
    "guide complet",
    "cliquez ici pour",
    "lire la suite",
    "abonnez-vous",
    "cet article a été",
    "publié le",
    "source :",
    "crédit photo",
]


# ==================== Nettoyage de texte ====================
def clean_text(value: str | None) -> str | None:
    """
    Nettoie un texte :
    - décode les entités HTML (&#8217; → ', &nbsp; → ' ')
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

    # 1. Décode les entités HTML (&#8217; → ', &amp; → &, etc.)
    value = html.unescape(value)

    # 2. Supprime les balises HTML
    value = re.sub(r"<[^>]+>", " ", value)

    # 3. Supprime les entités HTML résiduelles non décodées
    #    (au cas où html.unescape n'a pas tout traité)
    value = re.sub(r"&#\d+;", "'", value)
    value = re.sub(r"&#x[0-9a-fA-F]+;", "'", value)
    value = re.sub(r"&[a-zA-Z]+;", " ", value)

    # 4. Supprime les caractères de contrôle
    value = re.sub(r"[\x00-\x1f\x7f]", " ", value)

    # 5. Normalise les espaces (y compris \xa0 = nbsp)
    value = re.sub(r"\s+", " ", value)

    return value.strip() or None


# ==================== Détection du pays ====================
def detect_pays(text: str | None) -> str | None:
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


# ==================== Normalisation d'URL ====================
def normalize_url(url: str | None) -> str | None:
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

        return urlunparse(
            (
                parsed.scheme,
                parsed.netloc.lower(),
                parsed.path.rstrip("/"),
                "",
                "&".join(query_parts),
                "",
            )
        )

    except Exception:
        return url


# ==================== Parsing de date ====================
def parse_date(value) -> str | None:
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


# ==================== Filtre de contenu ====================
def _is_article_blog(description: str) -> bool:
    """
    Détecte si une description ressemble à un article de blog
    plutôt qu'à une offre d'emploi.
    """

    if not description:
        return False

    # Vérifie les 500 premiers caractères
    desc_lower = description[:500].lower()

    for mot in MOTS_ARTICLE:
        if mot in desc_lower:
            return True

    return False


def _truncate_description(description: str, max_length: int = 5000) -> str:
    """
    Tronque une description trop longue.

    Args:
        description : Description à tronquer
        max_length  : Longueur maximum

    Returns:
        Description tronquée avec "..."
    """

    if not description or len(description) <= max_length:
        return description

    # Essaie de couper à la fin d'une phrase
    truncated = description[:max_length]
    last_period = truncated.rfind(".")

    if last_period > max_length * 0.7:
        return truncated[: last_period + 1] + " [...]"

    return truncated + " [...]"


# ==================== Normalisation d'offre ====================
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

    # ⚠️ FILTRE 1 : Rejette les descriptions trop longues (articles de blog)
    if description and len(description) > 10000:
        description = _truncate_description(description, 5000)

    # ⚠️ FILTRE 2 : Tronque les descriptions qui ressemblent à un article
    if description and _is_article_blog(description):
        description = _truncate_description(description, 500)

    # Détecte le pays si non fourni
    pays = clean_text(job.get("pays"))
    if not pays:
        pays = detect_pays(f"{titre} {description or ''}")

    # Normalise le type de contrat
    type_contrat = clean_text(job.get("type_contrat"))
    if type_contrat:
        type_contrat = type_contrat.strip().title()

    # Normalise le niveau
    niveau = clean_text(job.get("niveau"))
    if niveau:
        niveau = niveau.strip().title()

    return {
        "titre": titre[:300],
        "entreprise": clean_text(job.get("entreprise")),
        "pays": pays,
        "ville": clean_text(job.get("ville")),
        "description": description,
        "type_contrat": type_contrat,
        "niveau": niveau,
        "categorie": clean_text(job.get("categorie")),
        "date_publication": parse_date(job.get("date_publication")),
        "date_expiration": parse_date(job.get("date_expiration")),
        "url": normalize_url(job.get("url")),
        "source": clean_text(job.get("source")) or "Inconnu",
        "teletravail": bool(job.get("teletravail", False)),
    }


# ==================== Empreinte de déduplication ====================
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
