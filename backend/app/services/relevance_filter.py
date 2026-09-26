"""
Filtre de pertinence v3 pour les offres d'emploi.

Analyse le contenu pour distinguer les vraies offres d'emploi
des articles de blog, actualites ou autres contenus non-pertinents.

Regles appliquees :
    1. Mots-cles forts (+3)
    2. Mots-cles faibles (+1)
    3. Indices de job (+2)
    4. Mots-cles blog (-5)
    5. Patterns speciaux : "recrute-DATE" (+5)
    6. Titre avec date (+2)
    7. Longueur description (+3/-3)
    8. Call-to-action (+2)
    9. Prefixe pays "XX:" (-4)
    10. Mots politiques (-4)
    11. Titre > 100 car. (-3)
"""

import re


# ==================== SOURCES FIABLES (bypass filtre) ====================
# Ces sources sont vérifiées manuellement : leurs offres sont TOUJOURS
# considérées comme pertinentes, sans passer par le scoring.
SOURCES_FIABLES = [
    # Job boards tech
    "Benin Digital",
    "ProGigFinder",
    "Jobzilla",
    "MyJobMag",
    "Flutterwave",
    "Kuda",
    "Paystack",

    # ATS (Greenhouse / Ashby)
    "Moniepoint (Greenhouse)",
    "Andela (Ashby)",
    "M-KOPA (Ashby)",
    "LemFi (Ashby)",
    "Sabi (Ashby)",
    "Carbon (Greenhouse)",
    "Jumia (Greenhouse)",

    # Remote international
    "WeWorkRemotely",
    "Himalayas",
    "NoDesk",
    "Hacker News Jobs",
    "Python.org Jobs",

    # ONG / International
    "ReliefWeb",
    "UNJobs",

    # Afrique locale
    "Projobivoire",
    "La Tempête Bénin",
    "La Tempête Bénin".replace("Bénin", "BÃ©nin"),  # variante cassée
    "La TempÃªte BÃ©nin",
    "Emploi Togo",
]


def is_source_fiable(source: str | None) -> bool:
    """Vérifie si une source est dans la whitelist."""
    if not source:
        return False

    source_lower = source.lower()

    for sf in SOURCES_FIABLES:
        if sf.lower() in source_lower:
            return True

    return False

from typing import Optional


# ==================== MOTS-CLES ====================

# Mots-cles forts (indiquent clairement une offre)
STRONG_KEYWORDS = [
    r"\brecrute\b",
    r"\brecrutent\b",
    r"\brecrutons\b",
    r"\boffre d'emploi\b",
    r"\boffres? d'emploi\b",
    r"\bposte à pourvoir\b",
    r"\bposte a pourvoir\b",
    r"\bcdi\b",
    r"\bcdd\b",
    r"\bcontrat à durée\b",
    r"\bcontrat a duree\b",
    r"\bcandidature\b",
    r"\bcandidatures\b",
    r"\bprofil recherché\b",
    r"\bprofil recherche\b",
    r"\bnous recherchons\b",
    r"\bnous recrutons\b",
    r"\bavis de recrutement\b",
    r"\bappel à candidatures?\b",
    r"\bavis de vacance\b",
    r"\bjob offer\b",
    r"\bwe are hiring\b",
    r"\bjob vacancy\b",
    r"\bposition available\b",
]

# Mots-cles faibles (indiquent vaguement un emploi)
WEAK_KEYWORDS = [
    r"\bemploi\b",
    r"\bemplois\b",
    r"\brecrutement\b",
    r"\brecrutements\b",
    r"\bcarrière\b",
    r"\bcarriere\b",
    r"\bpostuler\b",
    r"\bstage\b",
    r"\bstages\b",
    r"\balternance\b",
    r"\bfreelance\b",
    r"\bjob\b",
    r"\bjobs\b",
    r"\bhire\b",
    r"\bhiring\b",
    r"\brecruitment\b",
    r"\bcareer\b",
]

# Mots-cles de blog/actualite (excluent l'offre)
BLOG_KEYWORDS = [
    r"\bactualité\b",
    r"\bactualites?\b",
    r"\bnews\b",
    r"\bconseil\b",
    r"\bconseils\b",
    r"\bguide\b",
    r"\bguides\b",
    r"\bformation\b",
    r"\bformations\b",
    r"\bsalon\b",
    r"\bévénement\b",
    r"\bevenement\b",
    r"\bclassement\b",
    r"\btop \d+\b",
    r"\bcomment faire\b",
    r"\bpourquoi\b",
    r"\b5 (astuces|conseils|erreurs)\b",
    r"\binterview\b",
    r"\btémoignage\b",
    r"\btemoignage\b",
    r"\bportrait\b",
    r"\bdossier\b",
    r"\bétude\b",
    r"\betude\b",
    r"\brapport\b",
    r"\barticle\b",
    r"\bblog\b",
    r"\bconseils carrière\b",
    r"\bledit\b",
    r"\banalyse\b",
    r"\bproduction des savoirs\b",
    r"\bchercheurs?\b",
    r"\brepensent\b",
]

# Indices d'une vraie offre
JOB_INDICATORS = [
    r"\bposte\b.*\b(libre|disponible|ouvert|à pourvoir)\b",
    r"\bdate limite\b",
    r"\bdate de clôture\b",
    r"\bdate de cloture\b",
    r"\bcv\b",
    r"\blettre de motivation\b",
    r"\bdiplôme\b",
    r"\bdiplome\b",
    r"\bexpérience\b",
    r"\bexperience\b",
    r"\bannées d'expérience\b",
    r"\bans? d'expérience\b",
]

# ==================== NOUVELLES REGLES v3 ====================

# Mots politiques (indiquent une actualité, pas une offre)
POLITICAL_KEYWORDS = [
    r"\bprésident\b",
    r"\bpresident\b",
    r"\bgouvernement\b",
    r"\bministre\b",
    r"\bministère\b",
    r"\bministere\b",
    r"\bparlement\b",
    r"\bdéputé\b",
    r"\bdepute\b",
    r"\bsénat\b",
    r"\bsenat\b",
    r"\bélection\b",
    r"\belection\b",
    r"\bvote\b",
    r"\bloi\b",
    r"\bréforme\b",
    r"\breforme\b",
    r"\bpolitique\b",
]

# Pays africains (pour detecter les prefixes "Ghana:", "Togo:")
AFRICAN_COUNTRIES = [
    "ghana", "togo", "benin", "bénin", "senegal", "sénégal",
    "nigeria", "mali", "niger", "guinee", "guinée", "burkina",
    "cote d'ivoire", "côte d'ivoire", "cameroon", "cameroun",
    "kenya", "ethiopia", "ethiopie", "tanzania", "tanzanie",
    "uganda", "ouganda", "rwanda", "burundi", "gambia", "gambie",
    "liberia", "libéria", "sierra leone", "mauritania", "mauritanie",
    "morocco", "maroc", "algeria", "algérie", "tunisia", "tunisie",
    "egypt", "égypte", "libya", "libye", "sudan", "soudan",
    "south africa", "afrique du sud", "zimbabwe", "zambia", "zambie",
    "mozambique", "angola", "congo", "gabon", "chad", "tchad",
    "central african", "centrafrique", "madagascar", "mauritius",
    "maurice", "cape verde", "cap-vert", "guinea-bissau",
    "guinée-bissau", "sao tome", "sao tomé",
]


# ==================== FONCTIONS ====================

def _count_matches(text: str, patterns: list[str]) -> int:
    """Compte les patterns qui matchent dans le texte."""
    count = 0
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            count += 1
    return count


def _has_country_prefix(titre: str) -> bool:
    """
    Detecte un prefixe de pays dans le titre.

    Ex: "Ghana: Le president...", "Togo: Nouvelle loi..."
    """

    titre_lower = titre.lower().strip()

    for country in AFRICAN_COUNTRIES:
        # Cherche "Country:" au debut du titre
        if titre_lower.startswith(f"{country}:"):
            return True
        if titre_lower.startswith(f"{country} :"):
            return True

    return False


def compute_relevance_score(
    titre: str,
    description: str,
    url: str = "",
) -> dict:
    """
    Calcule un score de pertinence pour une offre.

    Returns:
        {
            "score": int,
            "is_job_offer": bool,
            "details": {...}
        }
    """

    # Combine titre + description + URL
    text = f"{titre} {description} {url}".lower()

    # ==================== COMPTAGE ====================
    strong_count = _count_matches(text, STRONG_KEYWORDS)
    weak_count = _count_matches(text, WEAK_KEYWORDS)
    blog_count = _count_matches(text, BLOG_KEYWORDS)
    job_indicators_count = _count_matches(text, JOB_INDICATORS)
    political_count = _count_matches(text, POLITICAL_KEYWORDS)

    # ==================== SCORE ====================
    score = 0

    # Mots-cles forts : +3 chacun
    score += strong_count * 3

    # Mots-cles faibles : +1 chacun
    score += weak_count * 1

    # Indices de job : +2 chacun
    score += job_indicators_count * 2

    # Mots-cles blog : -5 chacun
    score -= blog_count * 5

    # ==================== REGLES v3 ====================

    # REGLE 1 : Prefixe pays "Ghana:", "Togo:" → -4
    has_prefix = _has_country_prefix(titre)
    if has_prefix:
        score -= 4

    # REGLE 2 : Mots politiques → -4 chacun
    score -= political_count * 4

    # REGLE 3 : Titre trop long (> 100 car.) → -3
    if len(titre) > 100:
        score -= 3

    # ==================== PATTERNS SPECIAUX ====================
    # "recrute-05/10/2026"
    if re.search(r"recrute[\s\-]+\d{2}/\d{2}/\d{4}", titre, re.IGNORECASE):
        score += 5

    # Titre avec date
    if re.search(r"\d{2}/\d{2}/\d{4}", titre):
        score += 2

    # ==================== LONGUEUR ====================
    desc_length = len(description or "")

    if desc_length > 500:
        score += 3
    elif desc_length > 300:
        score += 2
    elif desc_length > 150:
        score += 1
    elif desc_length < 50:
        score -= 3

    # ==================== CALL-TO-ACTION ====================
    if re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text):
        score += 2

    if re.search(r"\b(postuler|apply|soumettre|candidater)\b", text):
        score += 2

    # ==================== RESULTAT ====================
    # Seuil : 2 points minimum
    # MAIS : si prefixe pays OU mots politiques detectes → rejet automatique
    force_reject = has_prefix or political_count > 0

    is_job_offer = (score >= 2) and not force_reject

    return {
        "score": score,
        "is_job_offer": is_job_offer,
        "details": {
            "strong_keywords": strong_count,
            "weak_keywords": weak_count,
            "blog_keywords": blog_count,
            "job_indicators": job_indicators_count,
            "political_keywords": political_count,
            "has_country_prefix": has_prefix,
            "title_length": len(titre),
            "description_length": desc_length,
        },
    }


def is_relevant_job(job: dict) -> tuple[bool, dict]:
    """Verifie si une offre est pertinente."""

    # ✅ Court-circuit : sources fiables → toujours pertinentes
    source = job.get("source")
    if is_source_fiable(source):
        return True, {
            "score": 100,
            "is_job_offer": True,
            "details": {"whitelisted": True, "source": source},
        }

    result = compute_relevance_score(
        titre=job.get("titre", ""),
        description=job.get("description", ""),
        url=job.get("url", ""),
    )

    return result["is_job_offer"], result


def filter_relevant_jobs(jobs: list[dict]) -> tuple[list[dict], dict]:
    """Filtre une liste d'offres pour ne garder que les pertinentes."""

    filtered = []
    rejected = []
    stats = {
        "total": len(jobs),
        "kept": 0,
        "rejected": 0,
        "reasons": {
            "blog_keywords": 0,
            "too_short": 0,
            "low_score": 0,
            "country_prefix": 0,
            "political": 0,
        },
    }

    for job in jobs:
        is_relevant, details = is_relevant_job(job)

        if is_relevant:
            filtered.append(job)
            stats["kept"] += 1
        else:
            rejected.append({
                "titre": job.get("titre", "")[:80],
                "score": details["score"],
                "details": details["details"],
            })
            stats["rejected"] += 1

            # Raison du rejet (priorite)
            d = details["details"]

            if d["has_country_prefix"]:
                stats["reasons"]["country_prefix"] += 1
            elif d["political_keywords"] > 0:
                stats["reasons"]["political"] += 1
            elif d["blog_keywords"] > 0:
                stats["reasons"]["blog_keywords"] += 1
            elif d["description_length"] < 50:
                stats["reasons"]["too_short"] += 1
            else:
                stats["reasons"]["low_score"] += 1

    return filtered, stats
