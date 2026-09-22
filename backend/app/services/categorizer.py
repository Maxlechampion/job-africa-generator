"""
Categorisation automatique des offres d'emploi.

Detecte :
    - Categorie (Informatique, Marketing, Finance...)
    - Type de contrat (CDI, CDD, Stage, Freelance...)
    - Teletravail (FR + EN)
    - Niveau d'experience (Junior, Mid, Senior)

Fusionne aussi les categories anglaises (importees de ProGigFinder,
WeWorkRemotely, etc.) vers les 13 categories canoniques francaises.
"""

import re


# ==================== Fusion des categories ====================
# Mapping des categories anglaises et variantes vers
# les 13 categories canoniques francaises.

CATEGORIE_FUSION = {
    # ─── → Informatique ───
    "technology": "Informatique",
    "software development": "Informatique",
    "software": "Informatique",
    "software engineering": "Informatique",
    "information technology": "Informatique",
    "it": "Informatique",
    "data & analytics": "Informatique",
    "data science": "Informatique",
    "data": "Informatique",
    "developer": "Informatique",
    "development": "Informatique",
    "programming": "Informatique",
    "devops": "Informatique",
    "cloud": "Informatique",
    "cybersecurity": "Informatique",
    "network": "Informatique",
    "sysadmin": "Informatique",
    "system administration": "Informatique",
    "web development": "Informatique",
    "mobile development": "Informatique",
    "qa": "Informatique",
    "testing": "Informatique",

    # ─── → Ingenierie ───
    "engineering": "Ingenierie",
    "civil engineering": "Ingenierie",
    "mechanical engineering": "Ingenierie",
    "electrical engineering": "Ingenierie",

    # ─── → Commercial / Vente ───
    "sales": "Commercial / Vente",
    "business development": "Commercial / Vente",
    "customer service": "Commercial / Vente",
    "customer success": "Commercial / Vente",
    "customer support": "Commercial / Vente",
    "account management": "Commercial / Vente",
    "account executive": "Commercial / Vente",

    # ─── → Marketing / Communication ───
    "marketing": "Marketing / Communication",
    "communications / digital marketing": "Marketing / Communication",
    "communications": "Marketing / Communication",
    "communication": "Marketing / Communication",
    "digital marketing": "Marketing / Communication",
    "content marketing": "Marketing / Communication",
    "social media": "Marketing / Communication",
    "seo": "Marketing / Communication",
    "design": "Marketing / Communication",
    "design / product": "Marketing / Communication",
    "ux design": "Marketing / Communication",
    "ui design": "Marketing / Communication",
    "graphic design": "Marketing / Communication",
    "brand": "Marketing / Communication",

    # ─── → Direction / Management ───
    "management": "Direction / Management",
    "operations": "Direction / Management",
    "consulting": "Direction / Management",
    "project management": "Direction / Management",
    "administrative": "Direction / Management",
    "product management": "Direction / Management",
    "product": "Direction / Management",
    "strategy": "Direction / Management",
    "executive": "Direction / Management",
    "leadership": "Direction / Management",

    # ─── → Comptabilite / Finance ───
    "finance": "Comptabilite / Finance",
    "banking & finance": "Comptabilite / Finance",
    "finance & accounting": "Comptabilite / Finance",
    "accounting": "Comptabilite / Finance",
    "audit": "Comptabilite / Finance",
    "banking": "Comptabilite / Finance",
    "insurance": "Comptabilite / Finance",
    "treasury": "Comptabilite / Finance",

    # ─── → Ressources Humaines ───
    "human resources": "Ressources Humaines",
    "hr": "Ressources Humaines",
    "recruitment": "Ressources Humaines",
    "talent acquisition": "Ressources Humaines",
    "people operations": "Ressources Humaines",

    # ─── → Juridique ───
    "legal": "Juridique",
    "legal & compliance": "Juridique",
    "compliance": "Juridique",
    "law": "Juridique",

    # ─── → Sante ───
    "healthcare": "Sante",
    "health": "Sante",
    "medical": "Sante",
    "pharma": "Sante",
    "pharmaceutical": "Sante",
    "nursing": "Sante",

    # ─── → Education / Formation ───
    "education": "Education / Formation",
    "training": "Education / Formation",
    "teaching": "Education / Formation",
    "academic": "Education / Formation",

    # ─── → Logistique / Transport ───
    "logistics": "Logistique / Transport",
    "transport": "Logistique / Transport",
    "supply chain": "Logistique / Transport",
    "warehouse": "Logistique / Transport",
    "shipping": "Logistique / Transport",

    # ─── → Hotellerie / Restauration ───
    "hospitality": "Hotellerie / Restauration",
    "restaurant": "Hotellerie / Restauration",
    "hotel": "Hotellerie / Restauration",
    "tourism": "Hotellerie / Restauration",
    "food & beverage": "Hotellerie / Restauration",

    # ─── → Autre (catch-all) ───
    "research": "Autre",
    "security": "Autre",
    "internships & entry level": "Autre",
    "internship": "Autre",
    "other": "Autre",
    "others": "Autre",
    "general": "Autre",
    "miscellaneous": "Autre",
    "non-classé": "Autre",
    "non classé": "Autre",
}


# ==================== Categories (patterns FR + EN) ====================
CATEGORIES = {
    "Informatique": [
        r"\b(developpeur|developpeuse|developer|programmeur|"
        r"python|java|javascript|typescript|php|ruby|go\b|rust|"
        r"full[- ]?stack|front[- ]?end|back[- ]?end|"
        r"data scientist|data analyst|data engineer|devops|sysadmin|"
        r"reseau|reseau informatique|cloud|aws|azure|gcp|"
        r"mobile|android|ios|flutter|react native|"
        r"web developer|software engineer|software developer|"
        r"ingenieur logiciel|architecte logiciel|cto|"
        r"informaticien|it support|support technique|"
        r"qa engineer|testeur|cybersecurity|securite informatique)\b",
    ],
    "Comptabilite / Finance": [
        r"\b(comptable|comptabilite|finance|financier|audit|"
        r"tresorerie|controle de gestion|fiscaliste|fiscalite|"
        r"analyste financier|credit analyst|risk manager|"
        r"accountant|finance officer|treasury|"
        r"chef comptable|assistant comptable|"
        r"financial analyst|banking|insurance)\b",
    ],
    "Marketing / Communication": [
        r"\b(marketing|communication|community manager|"
        r"social media|seo|sem|content manager|"
        r"redacteur|redactrice|copywriter|"
        r"charge de communication|responsable marketing|"
        r"digital marketing|growth hacker|brand manager|"
        r"graphic designer|ux designer|ui designer|"
        r"designer|webdesigner|directeur artistique)\b",
    ],
    "Commercial / Vente": [
        r"\b(commercial|commerciale|vente|vendeur|vendeuse|"
        r"business developer|account manager|"
        r"charge de clientele|responsable commercial|"
        r"sales representative|sales manager|"
        r"business development|account executive|"
        r"customer success|customer support)\b",
    ],
    "Ressources Humaines": [
        r"\b(rh\b|ressources humaines|recrutement|recruteur|"
        r"talent acquisition|hr manager|hr officer|"
        r"charge de recrutement|responsable rh|"
        r"gestionnaire paie|human resources)\b",
    ],
    "Sante": [
        r"\b(medecin|docteur|infirmier|infirmiere|pharmacien|"
        r"pharmacienne|sage[- ]?femme|kinesitherapeute|"
        r"sante|medical|hospital|clinique|"
        r"laboratoire|biologiste|dentiste|"
        r"health|nurse|doctor|pharmacist)\b",
    ],
    "Education / Formation": [
        r"\b(enseignant|enseignante|professeur|formateur|"
        r"formatrice|instituteur|institutrice|"
        r"education|pedagogie|tuteur|"
        r"teacher|trainer|instructor|"
        r"directeur pedagogique|conseiller pedagogique)\b",
    ],
    "Ingenierie": [
        r"\b(ingenieur|ingenieure|engineer|"
        r"genie civil|mecanique|electrique|"
        r"btp|batiment|construction|chantier|"
        r"civil engineer|mechanical engineer|"
        r"electrical engineer|chef de chantier)\b",
    ],
    "Logistique / Transport": [
        r"\b(logistique|logistics|transport|chauffeur|chauffeuse|"
        r"approvisionnement|supply chain|"
        r"gestionnaire stock|magasinier|"
        r"agent de transit|transitaire|"
        r"warehouse|driver|supply manager)\b",
    ],
    "Juridique": [
        r"\b(juriste|avocat|avocate|notaire|"
        r"juridique|legal|droit|"
        r"paralegal|legal officer|"
        r"conseiller juridique|assistant juridique)\b",
    ],
    "Direction / Management": [
        r"\b(directeur|directrice|manager|"
        r"chef de projet|chef de service|"
        r"responsable|coordinateur|coordinatrice|"
        r"ceo|cfo|coo|cto|dg\b|directeur general|"
        r"project manager|program manager|"
        r"operations manager|general manager)\b",
    ],
    "Hotellerie / Restauration": [
        r"\b(hotellerie|restauration|restaurant|hotel|"
        r"cuisinier|cuisiniere|chef cuisinier|"
        r"serveur|serveuse|barman|receptionniste|"
        r"housekeeping|gouvernante|"
        r"waiter|waitress|cook|chef)\b",
    ],
}


# ==================== Types de contrat ====================
TYPES_CONTRAT = {
    "CDI": r"\b(cdi|contrat a duree indeterminee|permanent|"
           r"full[- ]?time|temps plein)\b",
    "CDD": r"\b(cdd|contrat a duree determinee|"
           r"fixed[- ]?term|temporary)\b",
    "Stage": r"\b(stage|stagiaire|internship|intern|"
             r"trainee)\b",
    "Alternance": r"\b(alternance|apprentissage|"
                  r"apprentice|work[- ]?study)\b",
    "Freelance": r"\b(freelance|independant|consultant|"
                 r"contractor|consulting)\b",
    "Temps partiel": r"\b(temps partiel|part[- ]?time|"
                     r"mi[- ]?temps)\b",
    "Benevolat": r"\b(benevolat|benevole|volunteer|"
                 r"volunteering)\b",
}


# ==================== Niveaux d'experience ====================
NIVEAUX = {
    "Stage": r"\b(stage|stagiaire|intern|internship|trainee)\b",
    "Junior": r"\b(junior|debutant|debutante|entry[- ]?level|"
              r"jeune diplome|0[- ]?[23] ans)\b",
    "Senior": r"\b(senior|confirme|confirmee|expert|experte|"
              r"lead|principal|[5-9]\+? ans|10\+? ans|"
              r"manager|director)\b",
    "Mid": r"\b(mid[- ]?level|intermediaire|[3-4]\+? ans|"
           r"mid\b)\b",
}


# ==================== Detection teletravail ====================
TELETRAVAIL_PATTERNS = [
    r"\b(teletravail|teletravailler|travail a distance|"
    r"distanciel|a distance)\b",
    r"\b(remote|work from home|wfh|anywhere|"
    r"fully remote|100% remote)\b",
]


# ==================== Fonctions utilitaires ====================

def normalize_categorie(value: str | None) -> str | None:
    """
    Normalise une categorie :
        - strip
        - fusion via CATEGORIE_FUSION (insensible a la casse)
        - title case en fallback

    Args:
        value : Categorie brute

    Returns:
        Categorie normalisee (une des 13 canoniques ou title case)
    """

    if not value:
        return None

    # Nettoie
    value = value.strip()

    if not value:
        return None

    # Fusion via le mapping (insensible a la casse)
    key = value.lower()

    if key in CATEGORIE_FUSION:
        return CATEGORIE_FUSION[key]

    # Fallback : title case
    return value.title()


def categorize(job: dict) -> str | None:
    """
    Detecte la categorie d'une offre a partir de son titre
    et de sa description.

    Args:
        job : Offre (avec titre + description)

    Returns:
        Nom de la categorie ou None
    """

    texte = (
        f"{job.get('titre', '')} "
        f"{job.get('description', '') or ''}"
    ).lower()

    if not texte.strip():
        return None

    for categorie, patterns in CATEGORIES.items():
        for pattern in patterns:
            if re.search(pattern, texte, re.IGNORECASE):
                return categorie

    return None


def detect_type_contrat(job: dict) -> str | None:
    """Detecte le type de contrat."""

    texte = (
        f"{job.get('titre', '')} "
        f"{job.get('description', '') or ''}"
    ).lower()

    for contrat, pattern in TYPES_CONTRAT.items():
        if re.search(pattern, texte, re.IGNORECASE):
            return contrat

    return None


def detect_teletravail(job: dict) -> bool:
    """Detecte si l'offre est en teletravail."""

    if job.get("teletravail"):
        return True

    texte = (
        f"{job.get('titre', '')} "
        f"{job.get('description', '') or ''} "
        f"{job.get('ville', '') or ''}"
    ).lower()

    for pattern in TELETRAVAIL_PATTERNS:
        if re.search(pattern, texte, re.IGNORECASE):
            return True

    return False


def detect_niveau(job: dict) -> str | None:
    """Detecte le niveau d'experience."""

    texte = (
        f"{job.get('titre', '')} "
        f"{job.get('description', '') or ''}"
    ).lower()

    for niveau, pattern in NIVEAUX.items():
        if re.search(pattern, texte, re.IGNORECASE):
            return niveau

    return None


def enrich_job(job: dict) -> dict:
    """
    Enrichit une offre avec les champs detectes.

    Ne remplace PAS les valeurs existantes mais les normalise.
    """

    # ─── Categorie ───
    if job.get("categorie"):
        job["categorie"] = normalize_categorie(job["categorie"])
    else:
        detected = categorize(job)
        job["categorie"] = normalize_categorie(detected) if detected else "Autre"

    # Si la normalisation retourne None, on met "Autre"
    if not job["categorie"]:
        job["categorie"] = "Autre"

    # ─── Type de contrat ───
    if job.get("type_contrat"):
        job["type_contrat"] = job["type_contrat"].strip().title()
    else:
        job["type_contrat"] = detect_type_contrat(job)

    # ─── Niveau ───
    if job.get("niveau"):
        job["niveau"] = job["niveau"].strip().title()
    else:
        job["niveau"] = detect_niveau(job)

    # ─── Teletravail ───
    if not job.get("teletravail"):
        job["teletravail"] = detect_teletravail(job)

    return job