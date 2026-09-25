#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 17c — CORRECTIFS FILTRE + DEDUPLICATION
 * ═══════════════════════════════════════════════════════════════
 *
 * Corrige 2 problèmes critiques :
 *   1. Erreur "ON CONFLICT DO UPDATE command cannot affect row a second time"
 *      → Déduplication par URL AVANT l'insertion
 *   2. Seuil du filtre trop strict
 *      → Passe de 4 à 2 points + patterns supplémentaires
 *
 * FICHIERS MODIFIÉS (2) :
 *   backend/app/services/relevance_filter.py
 *   backend/app/services/job_service.py
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

const MODULE_ID = "17c";
const MODULE_NAME = "Fix filtre + dedup";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/services/relevance_filter.py",
  "backend/app/services/job_service.py",
];

// ==================== relevance_filter.py (avec correctifs) ====================

const RELEVANCE_FILTER = `"""
Filtre de pertinence pour les offres d'emploi.

Analyse le contenu pour distinguer les vraies offres d'emploi
des articles de blog, actualites ou autres contenus non-pertinents.
"""

import re
from typing import Optional


# ==================== MOTS-CLES ====================

# Mots-cles forts (indiquent clairement une offre)
STRONG_KEYWORDS = [
    r"\\brecrute\\b",
    r"\\brecrutent\\b",
    r"\\brecrutons\\b",
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

# Mots-cles faibles (indiquent vaguement un emploi)
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

# Mots-cles de blog/actualite (excluent l'offre)
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

    # Mots-cles forts : +3 chacun
    score += strong_count * 3

    # Mots-cles faibles : +1 chacun
    score += weak_count * 1

    # Indices de job : +2 chacun
    score += job_indicators_count * 2

    # Mots-cles blog : -5 chacun
    score -= blog_count * 5

    # ==================== PATTERNS SPECIAUX ====================
    # "recrute-05/10/2026" (format courant sur Emploi Togo, etc.)
    if re.search(r"recrute[\\s\\-]+\\d{2}/\\d{2}/\\d{4}", titre, re.IGNORECASE):
        score += 5

    # Titre avec date "05/10/2026"
    if re.search(r"\\d{2}/\\d{2}/\\d{4}", titre):
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
    if re.search(r"[\\w\\.-]+@[\\w\\.-]+\\.\\w+", text):
        score += 2

    if re.search(r"\\b(postuler|apply|soumettre|candidater)\\b", text):
        score += 2

    # ==================== RESULTAT ====================
    # Seuil : 2 points minimum (plus tolerant)
    is_job_offer = score >= 2

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
    """Verifie si une offre est pertinente."""

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

            if details["details"]["blog_keywords"] > 0:
                stats["reasons"]["blog_keywords"] += 1
            elif details["details"]["description_length"] < 50:
                stats["reasons"]["too_short"] += 1
            else:
                stats["reasons"]["low_score"] += 1

    return filtered, stats
`;

// ==================== job_service.py (avec déduplication) ====================

const JOB_SERVICE = `"""
Service de gestion des offres d'emploi.

CRUD + recherche + statistiques.
"""

from typing import Optional

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.services.normalizer import normalize_job
from app.services.relevance_filter import filter_relevant_jobs


logger = get_logger(__name__)

TABLE = "jobs"


# ==================== CREATION ====================
def create_job(job: dict) -> list[dict]:
    """Insere ou met a jour une offre."""

    normalized = normalize_job(job)

    try:
        response = (
            supabase.table(TABLE)
            .upsert(normalized, on_conflict="url")
            .execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur creation offre : {e}")
        return []


def bulk_create_jobs(jobs: list[dict]) -> dict:
    """
    Insere un lot d'offres avec filtre + deduplication.
    """

    if not jobs:
        return {"inserted": 0, "skipped": 0}

    total_recu = len(jobs)

    # ==================== FILTRE DE PERTINENCE ====================
    jobs_filtered, filter_stats = filter_relevant_jobs(jobs)

    logger.info(
        f"Filtre pertinence : {filter_stats['kept']} gardees, "
        f"{filter_stats['rejected']} rejetees (sur {total_recu})"
    )

    if filter_stats["rejected"] > 0:
        logger.info(f"   Raisons : {filter_stats['reasons']}")

    if not jobs_filtered:
        logger.warning("Aucune offre pertinente dans ce lot")
        return {"inserted": 0, "skipped": total_recu}

    # ==================== NORMALISATION ====================
    normalized = [normalize_job(j) for j in jobs_filtered]

    # ==================== DEDUPLICATION INTERNE ====================
    # Evite l'erreur "ON CONFLICT DO UPDATE command cannot affect row a second time"
    seen_urls = set()
    deduped = []

    for job in normalized:
        url = job.get("url")
        if not url:
            continue
        if url in seen_urls:
            continue
        seen_urls.add(url)
        deduped.append(job)

    doublons_internes = len(normalized) - len(deduped)

    if doublons_internes > 0:
        logger.info(
            f"Deduplication interne : {doublons_internes} doublons supprimes"
        )

    skipped = total_recu - len(deduped)

    if not deduped:
        return {"inserted": 0, "skipped": skipped}

    # ==================== INSERTION PAR LOTS ====================
    inserted = 0
    batch_size = 100

    for i in range(0, len(deduped), batch_size):
        batch = deduped[i:i + batch_size]

        try:
            response = (
                supabase.table(TABLE)
                .upsert(batch, on_conflict="url")
                .execute()
            )
            inserted += len(response.data or [])
        except Exception as e:
            logger.error(f"Erreur insertion lot : {e}")

    return {"inserted": inserted, "skipped": skipped}


# ==================== LECTURE ====================
def get_jobs(
    limit: int = 50,
    offset: int = 0,
    q: Optional[str] = None,
    pays: Optional[str] = None,
    ville: Optional[str] = None,
    categorie: Optional[str] = None,
    type_contrat: Optional[str] = None,
    teletravail: Optional[bool] = None,
) -> dict:
    """Recherche paginee avec filtres."""

    query = supabase.table(TABLE).select("*", count="exact")

    if q:
        query = query.or_(
            f"titre.ilike.%{q}%,"
            f"description.ilike.%{q}%,"
            f"entreprise.ilike.%{q}%"
        )

    if pays:
        query = query.ilike("pays", f"%{pays}%")

    if ville:
        query = query.ilike("ville", f"%{ville}%")

    if categorie:
        query = query.eq("categorie", categorie)

    if type_contrat:
        query = query.eq("type_contrat", type_contrat)

    if teletravail is not None:
        query = query.eq("teletravail", teletravail)

    response = (
        query
        .order("boost_score", desc=True)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return {
        "total": response.count or 0,
        "limit": limit,
        "offset": offset,
        "results": response.data or [],
    }


def get_job(job_id: int) -> Optional[dict]:
    """Recupere une offre par son ID."""

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .eq("id", job_id)
            .maybe_single()
            .execute()
        )
        return response.data if response else None

    except Exception as e:
        logger.error(f"Erreur lecture offre {job_id} : {e}")
        return None


# ==================== STATISTIQUES ====================
def get_stats() -> dict:
    """Statistiques globales."""

    try:
        total = (
            supabase.table(TABLE)
            .select("id", count="exact")
            .execute()
        )
        return {"total_offres": total.count or 0}

    except Exception as e:
        logger.error(f"Erreur stats : {e}")
        return {"total_offres": 0}


def get_countries() -> list[str]:
    """Liste des pays presents."""

    try:
        response = (
            supabase.table(TABLE)
            .select("pays")
            .not_.is_("pays", "null")
            .execute()
        )
        return sorted({
            r["pays"] for r in response.data or []
            if r.get("pays")
        })

    except Exception as e:
        logger.error(f"Erreur countries : {e}")
        return []


def get_categories() -> list[str]:
    """Liste des categories presentes."""

    try:
        response = (
            supabase.table(TABLE)
            .select("categorie")
            .not_.is_("categorie", "null")
            .execute()
        )
        return sorted({
            r["categorie"] for r in response.data or []
            if r.get("categorie")
        })

    except Exception as e:
        logger.error(f"Erreur categories : {e}")
        return []


def get_sources() -> list[str]:
    """Liste des sources presentes."""

    try:
        response = (
            supabase.table(TABLE)
            .select("source")
            .not_.is_("source", "null")
            .execute()
        )
        return sorted({
            r["source"] for r in response.data or []
            if r.get("source")
        })

    except Exception as e:
        logger.error(f"Erreur sources : {e}")
        return []
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/services/relevance_filter.py": RELEVANCE_FILTER,
  "backend/app/services/job_service.py": JOB_SERVICE,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 17c — FIX FILTRE + DEDUP");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    log.info("Ce module ne fait que modifier des fichiers existants.");
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    return;
  }

  log.section("Modification de " + Object.keys(FILES).length + " fichiers");

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
      filesOverwritten: results.overwritten,
      note: "Fix : deduplication interne + seuil 2 + patterns dates",
    });
  }

  log.banner("MODULE 17c — TERMINE");

  console.log("");
  console.log("  Corrections :");
  console.log("  1. Deduplication interne par URL");
  console.log("     (evite ON CONFLICT DO UPDATE error)");
  console.log("");
  console.log("  2. Seuil du filtre : 4 -> 2 points");
  console.log("     (plus tolerant)");
  console.log("");
  console.log("  3. Patterns ajoutes :");
  console.log("     - recrute-05/10/2026");
  console.log("     - recrutent / recrutons");
  console.log("     - titres avec dates");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Verifier la syntaxe :");
  console.log("     cd backend");
  console.log("     python -c 'from app.services.job_service import bulk_create_jobs; print(\\'OK\\')'");
  console.log("");
  console.log("  2. Relancer une collecte :");
  console.log("     python -m scripts.run_collect");
  console.log("");
  console.log("  3. Verifier que WeWorkRemotely insere bien");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});