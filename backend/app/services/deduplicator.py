"""
Service de deduplication des offres d'emploi.

Trois niveaux de deduplication :
    1. URL identique (exact)
    2. Empreinte (titre + entreprise + ville)
    3. Similarite floue (rapidfuzz)

Le troisieme niveau est optionnel et peut etre remplace
par une deduplication semantique (module 08 IA).
"""

from rapidfuzz import fuzz

from app.core.logger import get_logger
from app.services.normalizer import job_fingerprint


logger = get_logger(__name__)


# ==================== Configuration ====================
SEUIL_SIMILARITE = 90  # 0-100


def is_duplicate(job1: dict, job2: dict) -> bool:
    """
    Verifie si deux offres sont des doublons.

    Args:
        job1, job2 : Offres normalisees

    Returns:
        True si doublons
    """

    # Niveau 1 : meme URL
    url1 = job1.get("url")
    url2 = job2.get("url")

    if url1 and url1 == url2:
        return True

    # Niveau 2 : meme empreinte
    fp1 = job_fingerprint(job1)
    fp2 = job_fingerprint(job2)

    if fp1 and fp1 == fp2:
        return True

    # Niveau 3 : similarite floue sur le titre
    titre1 = job1.get("titre") or ""
    titre2 = job2.get("titre") or ""

    if not titre1 or not titre2:
        return False

    # Verifie aussi que l'entreprise est identique
    ent1 = (job1.get("entreprise") or "").lower().strip()
    ent2 = (job2.get("entreprise") or "").lower().strip()

    if ent1 and ent2 and ent1 != ent2:
        # Entreprises differentes : pas un doublon
        return False

    # Similarite floue sur le titre
    ratio = fuzz.token_set_ratio(titre1.lower(), titre2.lower())

    if ratio >= SEUIL_SIMILARITE:
        # Verifie aussi la ville si presente
        ville1 = (job1.get("ville") or "").lower().strip()
        ville2 = (job2.get("ville") or "").lower().strip()

        if ville1 and ville2 and ville1 != ville2:
            return False

        return True

    return False


def deduplicate(jobs: list[dict]) -> list[dict]:
    """
    Supprime les doublons dans une liste d'offres.

    Args:
        jobs : Liste d'offres normalisees

    Returns:
        Liste sans doublons
    """

    if not jobs:
        return []

    uniques = []
    doublons = 0

    for job in jobs:
        is_dup = False

        for existing in uniques:
            if is_duplicate(job, existing):
                is_dup = True
                doublons += 1
                break

        if not is_dup:
            uniques.append(job)

    if doublons:
        logger.info(
            f"Deduplication : {len(jobs)} -> {len(uniques)} "
            f"({doublons} doublon(s) supprime(s))"
        )

    return uniques
