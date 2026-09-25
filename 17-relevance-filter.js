#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 17 — FILTRE DE PERTINENCE (exclure les blogs)
 * ═══════════════════════════════════════════════════════════════
 *
 * Implémente un filtre intelligent qui :
 *   - Calcule un score de pertinence pour chaque offre
 *   - Exclut les articles de blog/actualités
 *   - Améliore la détection du pays
 *
 * FICHIERS CRÉÉS (1) :
 *   backend/app/services/relevance_filter.py
 *
 * FICHIERS MODIFIÉS (1) :
 *   backend/app/services/normalizer.py
 *
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";

import { exists, writeFiles, removeFile, ROOT } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";
import { markInstalled, markUninstalled, isInstalled } from "./_lib/registry.js";
import { validateRequirements } from "./_lib/validator.js";

const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  uninstall: args.includes("--uninstall"),
  verbose: args.includes("--verbose"),
};

const MODULE_ID = "17";
const MODULE_NAME = "Filtre de pertinence";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/services/normalizer.py",
];

// ==================== relevance_filter.py ====================

const RELEVANCE_FILTER = `"""
Filtre de pertinence pour les offres d'emploi.

Analyse le contenu pour distinguer les vraies offres d'emploi
des articles de blog, actualités ou autres contenus non-pertinents.
"""

import re
from typing import Optional


# ==================== MOTS-CLÉS ====================

# Mots-clés forts (indiquent clairement une offre)
STRONG_KEYWORDS = [
    r"\\brecrute\\b",
    r"\\boffre d'emploi\\b",
    r"\\boffres? d'emploi\\b",
    r"\\bposte à pourvoir\\b",
    r"\\bposte a pourvoir\\b",
    r"\\bcdi\\b",
    r"\\bcdd\\b",
    r"\\bcontrat à durée\\b",
    r"\\bcontrat a duree\\b",
    r"\\bcandidature\\b",
    r"\\bcandidatures\\b",
    r"\\bprofil recherché\\b",
    r"\\bprofil recherche\\b",
    r"\\bnous recherchons\\b",
    r"\\bnous recrutons\\b",
    r"\\bavis de recrutement\\b",
    r"\\bappel à candidatures?\\b",
    r"\\bavis de vacance\\b",
    r"\\bjob offer\\b",
    r"\\bwe are hiring\\b",
    r"\\bjob vacancy\\b",
    r"\\bposition available\\b",
]

# Mots-clés faibles (indiquent vaguement un emploi)
WEAK_KEYWORDS = [
    r"\\bemploi\\b",
    r"\\bemplois\\b",
    r"\\brecrutement\\b",
    r"\\brecrutements\\b",
    r"\\bcarrière\\b",
    r"\\bcarriere\\b",
    r"\\bpostuler\\b",
    r"\\bstage\\b",
    r"\\bstages\\b",
    r"\\balternance\\b",
    r"\\bfreelance\\b",
    r"\\bjob\\b",
    r"\\bjobs\\b",
    r"\\bhire\\b",
    r"\\bhiring\\b",
    r"\\brecruitment\\b",
    r"\\bcareer\\b",
]

# Mots-clés de blog/actualité (excluent l'offre)
BLOG_KEYWORDS = [
    r"\\bactualité\\b",
    r"\\bactualites?\\b",
    r"\\bnews\\b",
    r"\\bconseil\\b",
    r"\\bconseils\\b",
    r"\\bguide\\b",
    r"\\bguides\\b",
    r"\\bformation\\b",
    r"\\bformations\\b",
    r"\\bsalon\\b",
    r"\\bévénement\\b",
    r"\\bevenement\\b",
    r"\\bclassement\\b",
    r"\\btop \\d+\\b",
    r"\\bcomment faire\\b",
    r"\\bpourquoi\\b",
    r"\\b5 (astuces|conseils|erreurs)\\b",
    r"\\binterview\\b",
    r"\\btémoignage\\b",
    r"\\btemoignage\\b",
    r"\\bportrait\\b",
    r"\\bdossier\\b",
    r"\\bétude\\b",
    r"\\betude\\b",
    r"\\brapport\\b",
    r"\\barticle\\b",
    r"\\bblog\\b",
    r"\\bconseils carrière\\b",
    r"\\bcarrière :\\b",
    r"\\bledit\\b",
    r"\\banalyse\\b",
]

# Indices d'une vraie offre
JOB_INDICATORS = [
    r"\\bposte\\b.*\\b(libre|disponible|ouvert|à pourvoir)\\b",
    r"\\bdate limite\\b",
    r"\\bdate de clôture\\b",
    r"\\bdate de cloture\\b",
    r"\\bcv\\b",
    r"\\blettre de motivation\\b",
    r"\\bdiplôme\\b",
    r"\\bdiplome\\b",
    r"\\bexpérience\\b",
    r"\\bexperience\\b",
    r"\\bannées d'expérience\\b",
    r"\\bans? d'expérience\\b",
]


# ==================== FONCTIONS ====================

def _count_matches(text: str, patterns: list[str]) -> int:
    """Compte les patterns qui matchent dans le texte."""
    count = 0
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            count += 1
    return count


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

    # ==================== SCORE ====================
    score = 0

    # Mots-clés forts : +3 chacun
    score += strong_count * 3

    # Mots-clés faibles : +1 chacun
    score += weak_count * 1

    # Indices de job : +2 chacun
    score += job_indicators_count * 2

    # Mots-clés blog : -5 chacun (pénalité forte)
    score -= blog_count * 5

    # ==================== LONGUEUR ====================
    desc_length = len(description or "")

    if desc_length > 500:
        score += 3
    elif desc_length > 300:
        score += 2
    elif desc_length > 150:
        score += 1
    elif desc_length < 50:
        score -= 3  # Trop court = probablement pas une offre

    # ==================== CALL-TO-ACTION ====================
    # Email présent
    if re.search(r"[\\w\\.-]+@[\\w\\.-]+\\.\\w+", text):
        score += 2

    # Lien "postuler"
    if re.search(r"\\b(postuler|apply|soumettre|candidater)\\b", text):
        score += 2

    # ==================== RÉSULTAT ====================
    # Seuil : 4 points minimum
    is_job_offer = score >= 4

    return {
        "score": score,
        "is_job_offer": is_job_offer,
        "details": {
            "strong_keywords": strong_count,
            "weak_keywords": weak_count,
            "blog_keywords": blog_count,
            "job_indicators": job_indicators_count,
            "description_length": desc_length,
        },
    }


def is_relevant_job(job: dict) -> tuple[bool, dict]:
    """
    Vérifie si une offre est pertinente.

    Args:
        job: Dict de l'offre

    Returns:
        (is_relevant, score_details)
    """

    result = compute_relevance_score(
        titre=job.get("titre", ""),
        description=job.get("description", ""),
        url=job.get("url", ""),
    )

    return result["is_job_offer"], result


def filter_relevant_jobs(jobs: list[dict]) -> tuple[list[dict], dict]:
    """
    Filtre une liste d'offres pour ne garder que les pertinentes.

    Args:
        jobs: Liste d'offres

    Returns:
        (jobs_filtrees, statistiques)
    """

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

            # Raison du rejet
            if details["details"]["blog_keywords"] > 0:
                stats["reasons"]["blog_keywords"] += 1
            elif details["details"]["description_length"] < 50:
                stats["reasons"]["too_short"] += 1
            else:
                stats["reasons"]["low_score"] += 1

    return filtered, stats
`;

// ==================== normalizer.py (avec nouvelle détection pays) ====================

const NORMALIZER = `"""
Normalisation des donnees d'offres d'emploi.

Fonctions :
    - clean_text : nettoie un texte (HTML, espaces)
    - detect_pays : detecte le pays depuis le texte
    - normalize_url : nettoie une URL (retire tracking)
    - parse_date : convertit une date en ISO 8601
    - normalize_job : normalise une offre complete
    - job_fingerprint : empreinte pour la deduplication
"""

import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, urlunparse

from slugify import slugify


# ==================== Mapping pays avec alias ====================
PAYS_AFRIQUE_OUEST = {
    # Benin
    "benin": "Benin",
    "benin": "Benin",
    "cotonou": "Benin",
    "porto-novo": "Benin",
    "porto novo": "Benin",
    "parakou": "Benin",
    "abomey": "Benin",
    ".bj": "Benin",
    "+229": "Benin",

    # Togo
    "togo": "Togo",
    "lome": "Togo",
    "kara": "Togo",
    "sokode": "Togo",
    ".tg": "Togo",
    "+228": "Togo",

    # Cote d'Ivoire
    "cote d'ivoire": "Cote d'Ivoire",
    "cote divoire": "Cote d'Ivoire",
    "cote-d'ivoire": "Cote d'Ivoire",
    "ivory coast": "Cote d'Ivoire",
    "abidjan": "Cote d'Ivoire",
    "yamoussoukro": "Cote d'Ivoire",
    "bouake": "Cote d'Ivoire",
    ".ci": "Cote d'Ivoire",
    "+225": "Cote d'Ivoire",

    # Senegal
    "senegal": "Senegal",
    "dakar": "Senegal",
    "thies": "Senegal",
    "saint-louis": "Senegal",
    ".sn": "Senegal",
    "+221": "Senegal",

    # Burkina Faso
    "burkina faso": "Burkina Faso",
    "burkina": "Burkina Faso",
    "ouagadougou": "Burkina Faso",
    "bobo-dioulasso": "Burkina Faso",
    ".bf": "Burkina Faso",
    "+226": "Burkina Faso",

    # Mali
    "mali": "Mali",
    "bamako": "Mali",
    "sikasso": "Mali",
    "segou": "Mali",
    ".ml": "Mali",
    "+223": "Mali",

    # Niger
    "niger": "Niger",
    "niamey": "Niger",
    "zinder": "Niger",
    "maradi": "Niger",
    ".ne": "Niger",
    "+227": "Niger",

    # Guinee
    "guinee": "Guinee",
    "conakry": "Guinee",
    ".gn": "Guinee",
    "+224": "Guinee",

    # Ghana
    "ghana": "Ghana",
    "accra": "Ghana",
    "kumasi": "Ghana",
    "tamale": "Ghana",
    ".gh": "Ghana",
    "+233": "Ghana",

    # Nigeria
    "nigeria": "Nigeria",
    "lagos": "Nigeria",
    "abuja": "Nigeria",
    "kano": "Nigeria",
    "ibadan": "Nigeria",
    "port harcourt": "Nigeria",
    ".ng": "Nigeria",
    "+234": "Nigeria",
}


def clean_text(value: Optional[str]) -> Optional[str]:
    """Nettoie un texte (HTML, espaces, controles)."""
    if not value:
        return None

    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"[\\x00-\\x1f\\x7f]", " ", value)
    value = " ".join(value.split())

    return value.strip() or None


def detect_pays(text: Optional[str]) -> Optional[str]:
    """Detecte le pays dans un texte (fallback)."""
    if not text:
        return None

    text_lower = text.lower()

    # Cherche les alias longs d'abord
    sorted_aliases = sorted(PAYS_AFRIQUE_OUEST.keys(), key=len, reverse=True)

    for alias in sorted_aliases:
        if alias.startswith(".") or alias.startswith("+"):
            continue
        if alias in text_lower:
            return PAYS_AFRIQUE_OUEST[alias]

    return None


def detect_pays_avance(
    job: dict,
    source_country: str | None = None,
) -> str | None:
    """
    Detection avancee du pays avec priorite aux signaux fiables.

    Ordre de priorite :
    1. Source (le plus fiable)
    2. URL (.bj, .sn, etc.)
    3. Telephone (+229, +221, etc.)
    4. Texte (titre + description)
    5. Ville
    """

    # 1. Source
    if source_country:
        return source_country

    # 2. URL
    url = (job.get("url") or "").lower()
    for alias, pays in PAYS_AFRIQUE_OUEST.items():
        if alias.startswith(".") and alias in url:
            return pays

    # 3. Telephone
    text_all = f"{job.get('titre', '')} {job.get('description', '')}"
    for alias, pays in PAYS_AFRIQUE_OUEST.items():
        if alias.startswith("+") and alias in text_all:
            return pays

    # 4. Texte (titre + description)
    text_lower = text_all.lower()
    sorted_aliases = sorted(
        [a for a in PAYS_AFRIQUE_OUEST.keys() if not a.startswith((".", "+"))],
        key=len,
        reverse=True,
    )

    for alias in sorted_aliases:
        if re.search(r"\\b" + re.escape(alias) + r"\\b", text_lower):
            return PAYS_AFRIQUE_OUEST[alias]

    # 5. Ville
    ville = (job.get("ville") or "").lower()
    if ville:
        for alias, pays in PAYS_AFRIQUE_OUEST.items():
            if not alias.startswith((".", "+")) and alias in ville:
                return pays

    return None


def normalize_url(url: Optional[str]) -> Optional[str]:
    """Nettoie une URL (retire tracking)."""
    if not url:
        return None

    try:
        parsed = urlparse(str(url))

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
    """Convertit une date en ISO 8601."""
    if not value:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, str):
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(value).isoformat()
        except Exception:
            pass

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


def normalize_job(
    job: dict,
    source_country: str | None = None,
) -> dict:
    """
    Normalise une offre d'emploi.

    Args:
        job: Offre brute
        source_country: Pays de la source (prioritaire)
    """

    titre = clean_text(job.get("titre")) or "Offre sans titre"
    description = clean_text(job.get("description"))

    # Detection avancee du pays
    pays = clean_text(job.get("pays"))
    if not pays:
        pays = detect_pays_avance(
            {
                "titre": titre,
                "description": description,
                "url": job.get("url"),
                "ville": job.get("ville"),
            },
            source_country=source_country,
        )

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
    """Genere une empreinte pour la deduplication."""
    parts = [
        slugify(job.get("titre") or ""),
        slugify(job.get("entreprise") or ""),
        slugify(job.get("ville") or ""),
    ]

    return "|".join(p for p in parts if p)
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/services/relevance_filter.py": RELEVANCE_FILTER,
  "backend/app/services/normalizer.py": NORMALIZER,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 17 — FILTRE DE PERTINENCE");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    for (const file of Object.keys(FILES)) {
      if (exists(file)) {
        if (!OPTIONS.dryRun) removeFile(file);
        log.file(file, "removed");
      }
    }
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    log.success("Module desinstalle.");
    return;
  }

  log.section("Creation/modification de " + Object.keys(FILES).length + " fichiers");

  const results = writeFiles(FILES, {
    overwrite: true,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s)"
  );

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
      filesOverwritten: results.overwritten,
    });
  }

  log.banner("MODULE 17 — TERMINE");

  console.log("");
  console.log("  Fichiers :");
  console.log("  - relevance_filter.py (nouveau)");
  console.log("  - normalizer.py (mise a jour)");
  console.log("");
  console.log("  Fonctionnalites :");
  console.log("  - Score de pertinence (0-20+)");
  console.log("  - Exclusion articles de blog");
  console.log("  - Detection pays avancee");
  console.log("");
  console.log("  Prochaine etape :");
  console.log("  Integrer le filtre dans job_service.py");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});