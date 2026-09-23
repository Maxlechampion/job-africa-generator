"""
Resumeur d'offres d'emploi.

Approche hybride :
    1. Nettoie le texte (HTML, entites, caracteres speciaux)
    2. Extrait les phrases cles (missions, competences, profil)
    3. Construit un resume factuel de 2-3 phrases
"""

import html
import re

from app.core.logger import get_logger

logger = get_logger(__name__)


# ==================== Patterns ====================
PHRASES_CLES = [
    # Missions
    r"(?:missions?|responsabilités?|attributions?)\s*:?\s*([^.]{30,300}\.)",
    r"(?:vous serez|vous aurez|le poste consiste|la mission consiste)[^.]{20,300}\.",
    r"(?:your mission|your role|responsibilities)[^.]{20,300}\.",
    # Profil recherché
    r"(?:profil|nous recherchons|recherché[e]?|candidat[e]?)\s*:?\s*([^.]{30,300}\.)",
    r"(?:compétences?|maîtrise|connaissance|expérience)[^.]{20,300}\.",
    r"(?:we are looking for|requirements|qualifications)[^.]{20,300}\.",
    # Description
    r"(?:développeur|ingénieur|chargé[e]?|responsable|manager|directeur|technicien)[^.]{30,300}\.",
]


def _clean_text(text: str) -> str:
    """Nettoie le texte brut (HTML, entités, caractères spéciaux)."""

    if not text:
        return ""

    # Décode les entités HTML (&nbsp; &amp; &quot; etc.)
    text = html.unescape(text)

    # Supprime les balises HTML
    text = re.sub(r"<[^>]+>", " ", text)

    # Supprime les entités HTML restantes (au cas où)
    text = re.sub(r"&[a-zA-Z]+;", " ", text)
    text = re.sub(r"&#\d+;", " ", text)

    # Supprime les caractères de contrôle
    text = re.sub(r"[\x00-\x1f\x7f]", " ", text)

    # Normalise les espaces (y compris \xa0 = nbsp)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def _is_meaningful(sentence: str) -> bool:
    """Verifie qu'une phrase est significative."""

    if not sentence or len(sentence) < 40:
        return False

    # Evite les phrases avec trop de caracteres speciaux
    special_chars = sum(1 for c in sentence if not c.isalnum() and c != " ")
    if special_chars > len(sentence) * 0.2:
        return False

    # Evite les phrases avec trop de chiffres
    digits = sum(1 for c in sentence if c.isdigit())
    if digits > len(sentence) * 0.3:
        return False

    return True


def _truncate(text: str, max_length: int = 300) -> str:
    """Tronque intelligemment à la fin d'une phrase."""

    if len(text) <= max_length:
        return text

    truncated = text[:max_length]
    last_period = truncated.rfind(".")

    if last_period > max_length * 0.6:
        return truncated[: last_period + 1]

    return truncated.rstrip() + "..."


def summarize(text: str, max_length: int = 300) -> str:
    """
    Genere un resume factuel d'une offre d'emploi.

    Args:
        text        : Texte de l'offre (titre + description)
        max_length  : Longueur max du resume

    Returns:
        Resume en francais ou en anglais
    """

    if not text or len(text.strip()) < 30:
        return text or ""

    text = _clean_text(text)

    # Si le texte est trop court apres nettoyage
    if len(text) < 50:
        return text

    # ==================== Essaie d'extraire des phrases clés ====================
    phrases_trouvees = []

    for pattern in PHRASES_CLES:
        matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
        for m in matches:
            m = m.strip()
            if _is_meaningful(m) and m not in phrases_trouvees:
                phrases_trouvees.append(m)
                if len(phrases_trouvees) >= 3:
                    break
        if len(phrases_trouvees) >= 3:
            break

    # ==================== Construit le résumé ====================
    if phrases_trouvees:
        resume = " ".join(phrases_trouvees)
        resume = _clean_text(resume)
        return _truncate(resume, max_length)

    # ==================== Fallback : phrases significatives ====================
    # Découpe en phrases
    sentences = re.split(r"(?<=[.!?])\s+", text)

    # Prend les 3 premières phrases significatives
    result_sentences = []
    for s in sentences:
        s = s.strip()
        if _is_meaningful(s):
            result_sentences.append(s)
            if len(result_sentences) >= 3:
                break

    if result_sentences:
        resume = " ".join(result_sentences)
        return _truncate(resume, max_length)

    # ==================== Fallback ultime : tronque ====================
    return _truncate(text, max_length)
