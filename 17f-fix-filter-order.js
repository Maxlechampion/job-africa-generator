#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 17f — FIX ORDRE (Normaliser AVANT filtrer)
 * ═══════════════════════════════════════════════════════════════
 *
 * Corrige l'ordre dans bulk_create_jobs :
 *   1. Normaliser (decoder HTML, nettoyer)
 *   2. Filtrer (detecter blogs, actualites)
 *   3. Inserer
 *
 * FICHIERS MODIFIÉS (1) :
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

const MODULE_ID = "17f";
const MODULE_NAME = "Fix ordre filtre";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/services/job_service.py",
];

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
    Insere un lot d'offres.

    ORDRE CORRECT :
        1. Normalisation (decoder HTML, nettoyer)
        2. Filtre de pertinence (detecter blogs, actualites)
        3. Deduplication interne
        4. Insertion
    """

    if not jobs:
        return {"inserted": 0, "skipped": 0}

    total_recu = len(jobs)

    # ==================== 1. NORMALISATION ====================
    # Important : normaliser AVANT le filtre pour que les entites HTML
    # soient decodees (&#xe9; → é) et que le filtre detecte les mots
    normalized = [normalize_job(j) for j in jobs]

    # ==================== 2. FILTRE DE PERTINENCE ====================
    jobs_filtered, filter_stats = filter_relevant_jobs(normalized)

    logger.info(
        f"Filtre pertinence : {filter_stats['kept']} gardees, "
        f"{filter_stats['rejected']} rejetees (sur {total_recu})"
    )

    if filter_stats["rejected"] > 0:
        logger.info(f"   Raisons : {filter_stats['reasons']}")

    if not jobs_filtered:
        logger.warning("Aucune offre pertinente dans ce lot")
        return {"inserted": 0, "skipped": total_recu}

    # ==================== 3. DEDUPLICATION INTERNE ====================
    seen_urls = set()
    deduped = []

    for job in jobs_filtered:
        url = job.get("url")
        if not url:
            continue
        if url in seen_urls:
            continue
        seen_urls.add(url)
        deduped.append(job)

    doublons_internes = len(jobs_filtered) - len(deduped)

    if doublons_internes > 0:
        logger.info(
            f"Deduplication interne : {doublons_internes} doublons supprimes"
        )

    skipped = total_recu - len(deduped)

    if not deduped:
        return {"inserted": 0, "skipped": skipped}

    # ==================== 4. INSERTION PAR LOTS ====================
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

const FILES = {
  "backend/app/services/job_service.py": JOB_SERVICE,
};

async function main() {
  log.banner("MODULE 17f — FIX ORDRE (Normaliser AVANT filtrer)");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    log.info("Ce module ne fait que modifier job_service.py.");
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    return;
  }

  log.section("Modification de job_service.py");

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
      note: "Ordre corrige : Normaliser AVANT filtrer",
    });
  }

  log.banner("MODULE 17f — TERMINE");

  console.log("");
  console.log("  Correction :");
  console.log("  - Normalisation AVANT le filtre de pertinence");
  console.log("");
  console.log("  Nouveau flux :");
  console.log("  1. Normalisation (decoder HTML, nettoyer)");
  console.log("  2. Filtre (detecter blogs, actualites)");
  console.log("  3. Deduplication");
  console.log("  4. Insertion");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Verifier la syntaxe :");
  console.log("     cd backend");
  console.log("     python -c 'from app.services.job_service import bulk_create_jobs; print(\\'OK\\')'");
  console.log("");
  console.log("  2. Relancer une collecte :");
  console.log("     python -m scripts.run_collect");
  console.log("");
  console.log("  3. Verifier qu'il n'y a plus d'actualites");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});