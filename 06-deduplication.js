#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 06 — DÉDUPLICATION + CATÉGORISATION
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute la déduplication avancée et la catégorisation
 * automatique des offres d'emploi.
 *
 * USAGE :
 *   node 06-deduplication.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle
 *   --dry-run        Simule
 *   --uninstall      Désinstalle
 *
 * PRÉREQUIS :
 *   - Modules 00, 01, 02 installés
 *   - rapidfuzz (dans requirements.txt du module 01)
 *   - python-slugify (dans requirements.txt du module 01)
 *
 * FICHIERS CRÉÉS (5) :
 *   backend/app/services/deduplicator.py
 *   backend/app/services/categorizer.py
 *   backend/app/services/cleanup_service.py
 *   backend/app/api/admin_dedup.py
 *   backend/scripts/clean_database.py
 *
 * FICHIERS MODIFIÉS (1) :
 *   backend/app/main.py
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

const MODULE_ID = "06";
const MODULE_NAME = "Deduplication + Categorisation";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/job_service.py",
  "backend/app/services/normalizer.py",
];

// ==================== Contenu des fichiers ====================

const DEDUPLICATOR = `"""
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
`;

const CATEGORIZER = `"""
Categorisation automatique des offres d'emploi.

Detecte :
    - Categorie (Informatique, Marketing, Finance...)
    - Type de contrat (CDI, CDD, Stage, Freelance...)
    - Teletravail (FR + EN)
    - Niveau d'experience (Junior, Mid, Senior)
"""

import re


# ==================== Categories ====================
CATEGORIES = {
    "Informatique": [
        r"\\b(developpeur|developpeuse|developer|programmeur|"
        r"python|java|javascript|typescript|php|ruby|go\\b|rust|"
        r"full[- ]?stack|front[- ]?end|back[- ]?end|"
        r"data scientist|data analyst|devops|sysadmin|"
        r"reseaux?|reseau|cloud|aws|azure|gcp|"
        r"mobile|android|ios|flutter|react native|"
        r"web developer|software engineer|"
        r"ingenieur logiciel|architecte logiciel|cto|"
        r"informaticien|it support|support technique)\\b",
    ],
    "Comptabilite / Finance": [
        r"\\b(comptable|comptabilite|finance|financier|audit|"
        r"tresorerie|controle de gestion|fiscaliste|fiscalite|"
        r"analyste financier|credit analyst|risk manager|"
        r"accountant|finance officer|treasury|"
        r"chef comptable|assistant comptable)\\b",
    ],
    "Marketing / Communication": [
        r"\\b(marketing|communication|community manager|"
        r"social media|seo|sem|content manager|"
        r"redacteur|redactrice|copywriter|"
        r"charge de communication|responsable marketing|"
        r"digital marketing|growth hacker|brand manager)\\b",
    ],
    "Commercial / Vente": [
        r"\\b(commercial|commerciale|vente|vendeur|vendeuse|"
        r"business developer|account manager|"
        r"charge de clientele|responsable commercial|"
        r"sales representative|sales manager|"
        r"business development|account executive)\\b",
    ],
    "Ressources Humaines": [
        r"\\b(rh\\b|ressources humaines|recrutement|recruteur|"
        r"talent acquisition|hr manager|hr officer|"
        r"charge de recrutement|responsable rh|"
        r"gestionnaire paie|human resources)\\b",
    ],
    "Sante": [
        r"\\b(medecin|docteur|infirmier|infirmiere|pharmacien|"
        r"pharmacienne|sage[- ]?femme|kinesitherapeute|"
        r"sante|medical|hospital|clinique|"
        r"laboratoire|biologiste|dentiste|"
        r"health|nurse|doctor|pharmacist)\\b",
    ],
    "Education / Formation": [
        r"\\b(enseignant|enseignante|professeur|formateur|"
        r"formatrice|instituteur|institutrice|"
        r"education|pedagogie|tuteur|"
        r"teacher|trainer|instructor|"
        r"directeur pedagogique|conseiller pedagogique)\\b",
    ],
    "Ingenierie": [
        r"\\b(ingenieur|ingenieure|engineer|"
        r"genie civil|mecanique|electrique|"
        r"btp|batiment|construction|chantier|"
        r"civil engineer|mechanical engineer|"
        r"electrical engineer|chef de chantier)\\b",
    ],
    "Logistique / Transport": [
        r"\\b(logistique|logistics|transport|chauffeur|chauffeuse|"
        r"approvisionnement|supply chain|"
        r"gestionnaire stock|magasinier|"
        r"agent de transit|transitaire|"
        r"warehouse|driver|supply manager)\\b",
    ],
    "Juridique": [
        r"\\b(juriste|avocat|avocate|notaire|"
        r"juridique|legal|droit|"
        r"paralegal|legal officer|"
        r"conseiller juridique|assistant juridique)\\b",
    ],
    "Direction / Management": [
        r"\\b(directeur|directrice|manager|"
        r"chef de projet|chef de service|"
        r"responsable|coordinateur|coordinatrice|"
        r"ceo|cfo|coo|cto|dg\\b|directeur general|"
        r"project manager|program manager)\\b",
    ],
    "Hotellerie / Restauration": [
        r"\\b(hotellerie|restauration|restaurant|hotel|"
        r"cuisinier|cuisiniere|chef cuisinier|"
        r"serveur|serveuse|barman|receptionniste|"
        r"housekeeping|gouvernante|"
        r"waiter|waitress|cook|chef)\\b",
    ],
}


# ==================== Types de contrat ====================
TYPES_CONTRAT = {
    "CDI": r"\\b(cdi|contrat a duree indeterminee|permanent|"
           r"full[- ]?time|temps plein)\\b",
    "CDD": r"\\b(cdd|contrat a duree determinee|"
           r"fixed[- ]?term|temporary)\\b",
    "Stage": r"\\b(stage|stagiaire|internship|intern|"
             r"trainee)\\b",
    "Alternance": r"\\b(alternance|apprentissage|"
                  r"apprentice|work[- ]?study)\\b",
    "Freelance": r"\\b(freelance|independant|consultant|"
                 r"contractor|consulting)\\b",
    "Temps partiel": r"\\b(temps partiel|part[- ]?time|"
                     r"mi[- ]?temps)\\b",
    "Benevolat": r"\\b(benevolat|benevole|volunteer|"
                 r"volunteering)\\b",
}


# ==================== Niveaux d'experience ====================
NIVEAUX = {
    "Stage": r"\\b(stage|stagiaire|intern|internship|trainee)\\b",
    "Junior": r"\\b(junior|debutant|debutante|entry[- ]?level|"
              r"jeune diplome|0[- ]?[23] ans)\\b",
    "Senior": r"\\b(senior|confirme|confirmee|expert|experte|"
              r"lead|principal|[5-9]\\+? ans|10\\+? ans|"
              r"manager|director)\\b",
    "Mid": r"\\b(mid[- ]?level|intermediaire|[3-4]\\+? ans|"
           r"mid\\b)\\b",
}


# ==================== Detection teletravail ====================
TELETRAVAIL_PATTERNS = [
    r"\\b(teletravail|teletravailler|travail a distance|"
    r"distanciel|a distance)\\b",
    r"\\b(remote|work from home|wfh|anywhere|"
    r"fully remote|100% remote)\\b",
]


# ==================== Fonctions ====================

def categorize(job: dict) -> str | None:
    """
    Detecte la categorie d'une offre.

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

    Ne remplace PAS les valeurs existantes.
    """

    if not job.get("categorie"):
        job["categorie"] = categorize(job)

    if not job.get("type_contrat"):
        job["type_contrat"] = detect_type_contrat(job)

    if not job.get("niveau"):
        job["niveau"] = detect_niveau(job)

    if not job.get("teletravail"):
        job["teletravail"] = detect_teletravail(job)

    return job
`;

const CLEANUP_SERVICE = `"""
Service de nettoyage de la base de donnees.

Fonctionnalites :
    - Detecter les doublons existants dans Supabase
    - Supprimer les doublons en gardant l'offre la plus ancienne
    - Enrichir les offres existantes (categorisation)
"""

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.services.deduplicator import is_duplicate
from app.services.categorizer import enrich_job


logger = get_logger(__name__)

TABLE = "jobs"


def fetch_all_jobs(limit: int = 5000) -> list[dict]:
    """Recupere toutes les offres de la base."""

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur fetch_all_jobs : {e}")
        return []


def find_duplicates() -> list[tuple[int, int]]:
    """
    Trouve les paires de doublons.

    Returns:
        Liste de tuples (id_a_garder, id_a_supprimer)
    """

    jobs = fetch_all_jobs()

    if not jobs:
        logger.info("Aucune offre en base")
        return []

    logger.info(f"Analyse de {len(jobs)} offres...")

    uniques = []
    duplicates = []

    for job in jobs:
        is_dup = False

        for existing in uniques:
            if is_duplicate(job, existing):
                # Le nouveau job est un doublon de l'existing
                # On garde l'existing (plus ancien) et on supprime le nouveau
                duplicates.append((existing["id"], job["id"]))
                is_dup = True
                break

        if not is_dup:
            uniques.append(job)

    logger.info(
        f"{len(duplicates)} doublon(s) trouve(s) "
        f"({len(uniques)} uniques sur {len(jobs)})"
    )

    return duplicates


def delete_jobs_by_ids(job_ids: list[int]) -> int:
    """Supprime des offres par leurs IDs."""

    if not job_ids:
        return 0

    try:
        response = (
            supabase.table(TABLE)
            .delete()
            .in_("id", job_ids)
            .execute()
        )
        deleted = len(response.data or [])
        logger.info(f"{deleted} offre(s) supprimee(s)")
        return deleted

    except Exception as e:
        logger.error(f"Erreur suppression : {e}")
        return 0


def clean_duplicates(dry_run: bool = False) -> dict:
    """
    Nettoie les doublons de la base.

    Args:
        dry_run : Si True, ne supprime rien, retourne juste les stats

    Returns:
        Statistiques du nettoyage
    """

    duplicates = find_duplicates()

    if not duplicates:
        return {
            "duplicates_found": 0,
            "deleted": 0,
            "dry_run": dry_run,
        }

    ids_to_delete = [dup[1] for dup in duplicates]

    if dry_run:
        logger.info(f"[DRY-RUN] Supprimerait {len(ids_to_delete)} offres")
        return {
            "duplicates_found": len(duplicates),
            "deleted": 0,
            "dry_run": True,
            "ids_to_delete": ids_to_delete[:20],
        }

    deleted = delete_jobs_by_ids(ids_to_delete)

    return {
        "duplicates_found": len(duplicates),
        "deleted": deleted,
        "dry_run": False,
    }


def enrich_existing_jobs(limit: int = 5000) -> dict:
    """
    Enrichit les offres existantes avec :
        - categorie
        - type_contrat
        - niveau
        - teletravail
    """

    jobs = fetch_all_jobs(limit)

    if not jobs:
        return {"processed": 0, "updated": 0}

    logger.info(f"Enrichissement de {len(jobs)} offres...")

    updated = 0

    for job in jobs:
        job_id = job.get("id")

        # Sauvegarde les valeurs actuelles
        old_cat = job.get("categorie")
        old_contrat = job.get("type_contrat")
        old_niveau = job.get("niveau")
        old_tt = job.get("teletravail")

        # Enrichit
        enriched = enrich_job(dict(job))

        # Detecte les changements
        changes = {}

        if not old_cat and enriched.get("categorie"):
            changes["categorie"] = enriched["categorie"]

        if not old_contrat and enriched.get("type_contrat"):
            changes["type_contrat"] = enriched["type_contrat"]

        if not old_niveau and enriched.get("niveau"):
            changes["niveau"] = enriched["niveau"]

        if old_tt is False and enriched.get("teletravail") is True:
            changes["teletravail"] = True

        if changes:
            try:
                supabase.table(TABLE).update(changes).eq("id", job_id).execute()
                updated += 1
            except Exception as e:
                logger.error(f"Erreur update #{job_id} : {e}")

    logger.info(f"{updated} offre(s) enrichie(s)")

    return {
        "processed": len(jobs),
        "updated": updated,
    }
`;

const ADMIN_DEDUP_API = `"""
Routes API admin pour la deduplication et le nettoyage.
"""

from fastapi import APIRouter, Query

from app.services.cleanup_service import (
    clean_duplicates,
    enrich_existing_jobs,
    find_duplicates,
)


router = APIRouter(prefix="/admin/dedup", tags=["admin-dedup"])


@router.get("/find", summary="Trouver les doublons (dry-run)")
def find_dup():
    """
    Trouve les doublons sans rien supprimer.

    Retourne la liste des paires (id_a_garder, id_a_supprimer).
    """

    duplicates = find_duplicates()

    return {
        "duplicates_found": len(duplicates),
        "pairs": [
            {"keep_id": k, "delete_id": d}
            for k, d in duplicates[:50]
        ],
    }


@router.post("/clean", summary="Supprimer les doublons")
def clean(dry_run: bool = Query(False, description="Simulation sans suppression")):
    """
    Nettoie les doublons de la base.

    Args:
        dry_run : Si True, ne supprime rien
    """

    return clean_duplicates(dry_run=dry_run)


@router.post("/enrich", summary="Enrichir les offres existantes")
def enrich(limit: int = Query(5000, ge=1, le=10000)):
    """
    Enrichit les offres existantes avec :
        - categorie
        - type_contrat
        - niveau
        - teletravail
    """

    return enrich_existing_jobs(limit)
`;

const CLEAN_DATABASE_SCRIPT = `"""
Script CLI de nettoyage et enrichissement de la base.

Usage :
    python -m scripts.clean_database find       # Trouver les doublons
    python -m scripts.clean_database clean      # Supprimer les doublons
    python -m scripts.clean_database enrich     # Enrichir les offres
    python -m scripts.clean_database all        # Tout faire
"""

import sys
from pathlib import Path

# Ajoute le dossier backend au PYTHONPATH
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.cleanup_service import (
    clean_duplicates,
    enrich_existing_jobs,
    find_duplicates,
)


def cmd_find():
    print("Recherche des doublons...")
    print()

    duplicates = find_duplicates()

    if not duplicates:
        print("Aucun doublon trouve !")
        return

    print(f"{len(duplicates)} doublon(s) trouve(s)")
    print()
    print("Premiers doublons (keep_id -> delete_id) :")

    for k, d in duplicates[:10]:
        print(f"  #{k}  <-  #{d}")

    if len(duplicates) > 10:
        print(f"  ... et {len(duplicates) - 10} autres")


def cmd_clean():
    print("Nettoyage des doublons...")
    print()

    result = clean_duplicates(dry_run=False)

    print(f"Doublons trouves : {result['duplicates_found']}")
    print(f"Supprimes        : {result['deleted']}")


def cmd_enrich():
    print("Enrichissement des offres...")
    print()

    result = enrich_existing_jobs()

    print(f"Traitees : {result['processed']}")
    print(f"Enrichies : {result['updated']}")


def cmd_all():
    print("=== NETTOYAGE COMPLET ===")
    print()

    print("1. Recherche des doublons...")
    duplicates = find_duplicates()
    print(f"   {len(duplicates)} doublon(s) trouve(s)")
    print()

    if duplicates:
        print("2. Suppression des doublons...")
        result = clean_duplicates(dry_run=False)
        print(f"   {result['deleted']} supprime(s)")
    else:
        print("2. Aucun doublon a supprimer")
    print()

    print("3. Enrichissement des offres...")
    result = enrich_existing_jobs()
    print(f"   {result['updated']} enrichie(s) sur {result['processed']}")
    print()

    print("=== TERMINE ===")


def main():
    if len(sys.argv) < 2:
        print("Usage : python -m scripts.clean_database <command>")
        print()
        print("Commandes disponibles :")
        print("  find     Trouver les doublons")
        print("  clean    Supprimer les doublons")
        print("  enrich   Enrichir les offres")
        print("  all      Tout faire")
        return

    cmd = sys.argv[1].lower()

    if cmd == "find":
        cmd_find()
    elif cmd == "clean":
        cmd_clean()
    elif cmd == "enrich":
        cmd_enrich()
    elif cmd == "all":
        cmd_all()
    else:
        print(f"Commande inconnue : {cmd}")
        print("Utilisez : find, clean, enrich, all")


if __name__ == "__main__":
    main()
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/services/deduplicator.py": DEDUPLICATOR,
  "backend/app/services/categorizer.py": CATEGORIZER,
  "backend/app/services/cleanup_service.py": CLEANUP_SERVICE,
  "backend/app/api/admin_dedup.py": ADMIN_DEDUP_API,
  "backend/scripts/clean_database.py": CLEAN_DATABASE_SCRIPT,
};

// ==================== Patch de main.py ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("admin_dedup")) {
    log.info("main.py deja patche (admin_dedup present)");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  let modified = false;

  // Patch import
  const importPatterns = [
    "from app.api import jobs, stats, collect, admin, collect_ats, collect_scrapers, collect_api",
    "from app.api import jobs, stats, collect, admin, collect_ats, collect_scrapers",
    "from app.api import jobs, stats, collect, admin, collect_ats",
    "from app.api import jobs, stats, collect, admin",
    "from app.api import jobs, stats, collect",
    "from app.api import jobs, stats",
  ];

  for (const pattern of importPatterns) {
    if (content.includes(pattern)) {
      content = content.replace(
        pattern,
        pattern + ", admin_dedup"
      );
      modified = true;
      break;
    }
  }

  // Patch include_router
  const includePatterns = [
    "app.include_router(collect_api.router)",
    "app.include_router(collect_scrapers.router)",
    "app.include_router(collect_ats.router)",
    "app.include_router(admin.router)",
    "app.include_router(collect.router)",
    "app.include_router(stats.router)",
  ];

  for (const pattern of includePatterns) {
    if (content.includes(pattern)) {
      content = content.replace(
        pattern,
        pattern + "\napp.include_router(admin_dedup.router)"
      );
      modified = true;
      break;
    }
  }

  if (modified && !OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
    log.file(mainPath + " (patché)", "overwritten");
  }

  return modified;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 06 — DÉDUPLICATION + CATÉGORISATION");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    process.exit(0);
  }

  // Désinstallation
  if (OPTIONS.uninstall) {
    for (const file of Object.keys(FILES)) {
      if (exists(file)) {
        if (!OPTIONS.dryRun) removeFile(file);
        log.file(file, "removed");
      }
    }
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    log.banner("MODULE 06 — DESINSTALLE");
    return;
  }

  // Création des fichiers
  log.section(`Creation de ${Object.keys(FILES).length} fichiers`);

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    `-> ${results.created} cree(s), ${results.overwritten} ecrase(s), ${results.skipped} ignore(s)`
  );

  log.section("Patch de main.py");
  patchMainPy();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 06 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Uvicorn redemarre automatiquement");
  console.log("  2. Chercher les doublons :");
  console.log("     GET /admin/dedup/find");
  console.log("  3. Nettoyer les doublons :");
  console.log("     POST /admin/dedup/clean");
  console.log("  4. Enrichir les offres :");
  console.log("     POST /admin/dedup/enrich");
  console.log("");
  console.log("  Ou en CLI :");
  console.log("     cd backend");
  console.log("     python -m scripts.clean_database find");
  console.log("     python -m scripts.clean_database clean");
  console.log("     python -m scripts.clean_database enrich");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});