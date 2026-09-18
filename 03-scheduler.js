#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 03 — SCHEDULER (Collecte automatique)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute la collecte automatique d'offres toutes les X heures
 * via APScheduler.
 *
 * USAGE :
 *   node 03-scheduler.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle (écrase les fichiers, backup auto)
 *   --dry-run        Simule sans écrire sur le disque
 *   --uninstall      Désinstalle le module
 *   --verbose        Affiche plus de détails
 *
 * PRÉREQUIS :
 *   - Module 00 (architecture) installé
 *   - Module 01 (backend base) installé
 *   - Module 02 (collecteurs) installé
 *
 * FICHIERS CRÉÉS (4) :
 *   backend/app/services/log_service.py
 *   backend/app/services/scheduler.py
 *   backend/app/api/admin.py
 *   backend/scripts/run_collect.py
 *
 * FICHIERS MODIFIÉS (1) :
 *   backend/app/main.py
 *
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { exists, writeFiles, removeFile, ROOT } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";
import {
  markInstalled,
  markUninstalled,
  isInstalled,
} from "./_lib/registry.js";
import { validateRequirements } from "./_lib/validator.js";

// ==================== Parse args ====================
const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  uninstall: args.includes("--uninstall"),
  verbose: args.includes("--verbose"),
};

// ==================== Constantes ====================
const MODULE_ID = "03";
const MODULE_NAME = "Scheduler";
const MODULE_VERSION = "1.0.0";

// ==================== Prérequis ====================
const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/api/collect.py",
  "backend/app/collectors/sources/relay_rss.py",
  "backend/app/services/job_service.py",
  "backend/app/core/supabase.py",
];

// ==================== Contenu des fichiers ====================

const LOG_SERVICE = `"""
Service de journalisation des collectes.

Enregistre chaque passage de collecte dans la table collect_logs
pour permettre un suivi et un debug a posteriori.
"""

from datetime import datetime, timezone, timedelta

from app.core.supabase import supabase
from app.core.logger import get_logger


logger = get_logger(__name__)

TABLE = "collect_logs"


def log_collect(
    source_nom: str,
    statut: str,
    offres_collectees: int = 0,
    offres_inserees: int = 0,
    offres_ignorees: int = 0,
    duree_secondes: float | None = None,
    erreur: str | None = None,
) -> dict | None:
    """
    Enregistre une ligne de log de collecte.
    """

    payload = {
        "source_nom": source_nom,
        "statut": statut,
        "offres_collectees": offres_collectees,
        "offres_inserees": offres_inserees,
        "offres_ignorees": offres_ignorees,
        "duree_secondes": duree_secondes,
        "erreur": erreur,
    }

    try:
        response = supabase.table(TABLE).insert(payload).execute()
        return response.data[0] if response.data else None

    except Exception as e:
        logger.error(f"Erreur ecriture log collect : {e}")
        return None


def get_logs(limit: int = 50) -> list[dict]:
    """Retourne les derniers logs de collecte."""

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur lecture logs : {e}")
        return []


def get_logs_by_source(source_nom: str, limit: int = 20) -> list[dict]:
    """Retourne les derniers logs pour une source donnee."""

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .eq("source_nom", source_nom)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur lecture logs source : {e}")
        return []


def get_stats_24h() -> dict:
    """Statistiques des collectes sur les 24 dernieres heures."""

    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .gte("created_at", since)
            .execute()
        )

        rows = response.data or []

        return {
            "periode": "24h",
            "total_collectes": len(rows),
            "total_offres_collectees": sum(
                r.get("offres_collectees", 0) for r in rows
            ),
            "total_offres_inserees": sum(
                r.get("offres_inserees", 0) for r in rows
            ),
            "total_erreurs": sum(
                1 for r in rows if r.get("statut") == "error"
            ),
        }

    except Exception as e:
        logger.error(f"Erreur stats 24h : {e}")
        return {
            "periode": "24h",
            "total_collectes": 0,
            "total_offres_collectees": 0,
            "total_offres_inserees": 0,
            "total_erreurs": 0,
        }
`;

const SCHEDULER_SERVICE = `"""
Scheduler automatique de collecte.

Utilise APScheduler pour lancer la collecte de toutes les
sources a intervalle regulier.

Usage :
    from app.services.scheduler import start_scheduler, stop_scheduler
    start_scheduler()  # au startup de FastAPI
    stop_scheduler()   # a l'arret
"""

import time

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.logger import get_logger
from app.collectors.sources.relay_rss import ALL_SOURCES
from app.services.job_service import bulk_create_jobs
from app.services.log_service import log_collect


logger = get_logger(__name__)


# ==================== Scheduler ====================
scheduler = BackgroundScheduler(
    timezone="UTC",
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 300,
    },
)


def run_all_collectors() -> dict:
    """
    Lance tous les collecteurs et insere les offres en base.

    Returns:
        Resume de la collecte
    """

    logger.info("=" * 60)
    logger.info("Demarrage de la collecte automatique")
    logger.info("=" * 60)

    start_time = time.time()

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for CollectorClass in ALL_SOURCES:
        collector = CollectorClass()
        source_name = collector.name

        source_start = time.time()

        try:
            jobs = collector.collect()
            collected = len(jobs)

            if collected == 0:
                duree = time.time() - source_start

                log_collect(
                    source_nom=source_name,
                    statut="success",
                    offres_collectees=0,
                    offres_inserees=0,
                    offres_ignorees=0,
                    duree_secondes=round(duree, 2),
                )

                details.append({
                    "source": source_name,
                    "status": "empty",
                    "collected": 0,
                    "inserted": 0,
                    "skipped": 0,
                })

                logger.info(f"  [SKIP] {source_name} : aucune offre")
                continue

            result = bulk_create_jobs(jobs)

            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            duree = time.time() - source_start

            log_collect(
                source_nom=source_name,
                statut="success",
                offres_collectees=collected,
                offres_inserees=inserted,
                offres_ignorees=skipped,
                duree_secondes=round(duree, 2),
            )

            details.append({
                "source": source_name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
                "duration": round(duree, 2),
            })

            logger.info(
                f"  [OK] {source_name} : "
                f"{collected} collectees, "
                f"{inserted} inserees, "
                f"{skipped} ignorees "
                f"({duree:.1f}s)"
            )

        except Exception as e:
            total_errors += 1

            duree = time.time() - source_start
            error_msg = str(e)[:500]

            log_collect(
                source_nom=source_name,
                statut="error",
                offres_collectees=0,
                offres_inserees=0,
                offres_ignorees=0,
                duree_secondes=round(duree, 2),
                erreur=error_msg,
            )

            details.append({
                "source": source_name,
                "status": "error",
                "error": error_msg,
                "duration": round(duree, 2),
            })

            logger.error(f"  [ERR] {source_name} : {error_msg}")

    total_duree = time.time() - start_time

    logger.info("=" * 60)
    logger.info(
        f"Collecte terminee en {total_duree:.1f}s : "
        f"{total_collected} collectees, "
        f"{total_inserted} inserees, "
        f"{total_skipped} ignorees, "
        f"{total_errors} erreurs"
    )
    logger.info("=" * 60)

    return {
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "total_duration": round(total_duree, 2),
        "details": details,
    }


def cleanup_expired():
    """
    Tache de nettoyage : desactive les offres premium expirees.
    Seront implementees dans le module 14 (monetisation).
    """

    logger.info("Nettoyage des offres expirees...")
    logger.info("Nettoyage termine")


def start_scheduler():
    """
    Demarre le scheduler avec les jobs configures.
    """

    if scheduler.running:
        logger.warning("Scheduler deja en cours d'execution")
        return

    interval_hours = settings.COLLECT_INTERVAL_HOURS

    # Job 1 : collecte automatique
    scheduler.add_job(
        run_all_collectors,
        trigger=IntervalTrigger(hours=interval_hours),
        id="collect_jobs",
        name=f"Collecte automatique ({interval_hours}h)",
        replace_existing=True,
    )

    # Job 2 : nettoyage horaire
    scheduler.add_job(
        cleanup_expired,
        trigger=IntervalTrigger(hours=1),
        id="cleanup_expired",
        name="Nettoyage offres expirees (1h)",
        replace_existing=True,
    )

    # Demarrage
    scheduler.start()

    logger.info("=" * 60)
    logger.info("Scheduler demarre")
    logger.info(f"   Collecte automatique : toutes les {interval_hours}h")
    logger.info("   Nettoyage : toutes les 1h")
    logger.info("=" * 60)


def stop_scheduler():
    """Arrete le scheduler proprement."""

    if not scheduler.running:
        return

    try:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler arrete")
    except Exception as e:
        logger.error(f"Erreur arret scheduler : {e}")


def get_scheduler_status() -> dict:
    """Retourne le statut du scheduler et la liste des jobs."""

    jobs = []

    if scheduler.running:
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": (
                    job.next_run_time.isoformat()
                    if job.next_run_time else None
                ),
                "trigger": str(job.trigger),
            })

    return {
        "running": scheduler.running,
        "jobs": jobs,
        "collect_interval_hours": settings.COLLECT_INTERVAL_HOURS,
    }
`;

const ADMIN_API = `"""
Routes API admin pour le scheduler et les logs.
"""

from fastapi import APIRouter, HTTPException

from app.services.scheduler import (
    get_scheduler_status,
    run_all_collectors,
)
from app.services.log_service import (
    get_logs,
    get_logs_by_source,
    get_stats_24h,
)


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/scheduler/status", summary="Statut du scheduler")
def scheduler_status():
    """Retourne le statut du scheduler et la liste des jobs."""
    return get_scheduler_status()


@router.post("/scheduler/trigger", summary="Declencher une collecte manuelle")
def trigger_collect():
    """
    Declenche immediatement une collecte de toutes les sources.

    ATTENTION : Cette operation peut prendre plusieurs minutes.
    """
    return run_all_collectors()


@router.get("/logs", summary="Derniers logs de collecte")
def list_logs(limit: int = 50):
    """Retourne les derniers logs de collecte."""

    if limit > 500:
        raise HTTPException(400, "Limit maximum : 500")

    return get_logs(limit)


@router.get("/logs/source/{source_nom}", summary="Logs d'une source")
def source_logs(source_nom: str, limit: int = 20):
    """Retourne les derniers logs pour une source donnee."""
    return get_logs_by_source(source_nom, limit)


@router.get("/logs/stats/24h", summary="Stats 24h")
def stats_24h():
    """Statistiques des collectes sur les 24 dernieres heures."""
    return get_stats_24h()
`;

const RUN_COLLECT_SCRIPT = `"""
Script CLI pour lancer une collecte manuellement.

Usage :
    python -m scripts.run_collect
"""

import sys
from pathlib import Path

# Ajoute le dossier backend au PYTHONPATH
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.scheduler import run_all_collectors


def main():
    print("=" * 60)
    print("Job Africa - Collecte manuelle")
    print("=" * 60)
    print()

    result = run_all_collectors()

    print()
    print("=" * 60)
    print("RESULTAT")
    print("=" * 60)
    print()
    print(f"  Total collectees : {result['total_collected']}")
    print(f"  Total inserees   : {result['total_inserted']}")
    print(f"  Total ignorees   : {result['total_skipped']}")
    print(f"  Total erreurs    : {result['total_errors']}")
    print(f"  Duree totale     : {result['total_duration']}s")
    print()
    print("  Details par source :")
    print("  " + "-" * 56)

    for d in result["details"]:
        status = d.get("status", "?")
        name = d.get("source", "?")[:25].ljust(25)

        if status == "success":
            info = (
                f"{d['collected']:>3} collectees, "
                f"{d['inserted']:>3} inserees, "
                f"{d['skipped']:>3} ignorees"
            )
            icon = "[OK]"
        elif status == "error":
            info = f"ERREUR : {d.get('error', '')[:40]}"
            icon = "[ERR]"
        else:
            info = "aucune offre"
            icon = "[SKIP]"

        print(f"  {icon} {name} {info}")

    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
`;

// ==================== Fichiers du module ====================
const FILES = {
  "backend/app/services/log_service.py": LOG_SERVICE,
  "backend/app/services/scheduler.py": SCHEDULER_SERVICE,
  "backend/app/api/admin.py": ADMIN_API,
  "backend/scripts/run_collect.py": RUN_COLLECT_SCRIPT,
};

// ==================== Patch de main.py ====================
/**
 * Patch robuste de main.py qui :
 *   1. Ajoute l'import du scheduler
 *   2. Ajoute l'import du router admin
 *   3. Ajoute le router admin
 *   4. Ajoute le startup_event
 *   5. Ajoute le shutdown_event
 *
 * Ne fait rien si déjà patché.
 */

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  // Vérifie si déjà patché
  if (content.includes("start_scheduler")) {
    log.info("main.py déjà patché (scheduler présent)");
    return true;
  }

  // ==================== Backup ====================
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");

    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));

    log.info(`Backup : _backups/${timestamp}/backend/app/main.py`);
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  // ==================== Patch 1 : import scheduler ====================
  if (!content.includes("from app.services.scheduler import")) {
    content = content.replace(
      /^(from app\.api import[^\n]*)$/m,
      "from app.services.scheduler import start_scheduler, stop_scheduler\n$1"
    );
  }

  // ==================== Patch 2 : import admin router ====================
  if (content.includes("from app.api import jobs, stats, collect") &&
      !content.includes("admin")) {
    content = content.replace(
      "from app.api import jobs, stats, collect",
      "from app.api import jobs, stats, collect, admin"
    );
  }

  // ==================== Patch 3 : include admin router ====================
  if (content.includes("app.include_router(collect.router)") &&
      !content.includes("app.include_router(admin.router)")) {
    content = content.replace(
      "app.include_router(collect.router)",
      "app.include_router(collect.router)\napp.include_router(admin.router)"
    );
  }

  // ==================== Patch 4 : startup / shutdown ====================
  if (!content.includes("start_scheduler()")) {
    // Cherche le dernier @app.on_event("startup") existant
    const startupRegex = /@app\.on_event\("startup"\)\s*\n(?:async )?def \w+\([^)]*\):\s*\n(?:\s+"""[^"]*"""\s*\n)?(?:\s+[^\n]+\n)*/;

    const schedulerStartup = `

# ==================== Scheduler ====================
@app.on_event("startup")
async def start_scheduler_event():
    """Demarre le scheduler automatique au startup."""
    start_scheduler()


@app.on_event("shutdown")
async def stop_scheduler_event():
    """Arrete le scheduler proprement a l'arret."""
    stop_scheduler()
`;

    if (startupRegex.test(content)) {
      // Ajoute après le startup existant
      content = content.replace(startupRegex, (match) => {
        return match + schedulerStartup;
      });
    } else {
      // Ajoute à la fin
      content += schedulerStartup;
    }
  }

  // ==================== Écriture ====================
  if (!OPTIONS.dryRun) {
    try {
      fs.writeFileSync(fullPath, content, "utf8");
      log.file(mainPath + " (patché)", "overwritten");
      return true;
    } catch (e) {
      log.error(`Écriture impossible : ${e.message}`);
      return false;
    }
  }

  return true;
}

// ==================== Rollback de main.py ====================
function unpatchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, "utf8");

  // Retire l'import
  content = content.replace(
    /from app\.services\.scheduler import[^\n]*\n/g,
    ""
  );

  // Retire admin de l'import
  content = content.replace(
    "from app.api import jobs, stats, collect, admin",
    "from app.api import jobs, stats, collect"
  );

  // Retire include_router(admin.router)
  content = content.replace(
    /app\.include_router\(admin\.router\)\n?/g,
    ""
  );

  // Retire le bloc scheduler
  content = content.replace(
    /\n# ==================== Scheduler ====================[\s\S]*?stop_scheduler\(\)\n/g,
    "\n"
  );

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(mainPath + " (nettoyé)", "overwritten");
}

// ==================== Résumé ====================
function showSummary(stats) {
  log.banner("MODULE 03 — TERMINE");

  console.log("");
  console.log("  Fichiers crees    :", stats.created);
  console.log("  Fichiers ecrases  :", stats.overwritten);
  console.log("  Fichiers ignores  :", stats.skipped);
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN : aucun fichier n'a ete reellement ecrit.");
    console.log("");
  }

  console.log("  ACTION REQUISE — Table collect_logs");
  console.log("  ---------------------------------------");
  console.log("");
  console.log("  Copie-colle ce SQL dans Supabase SQL Editor :");
  console.log("");

  const sql = `create table if not exists public.collect_logs (
    id bigint generated by default as identity primary key,
    source_nom text,
    statut text check (statut in ('success', 'error', 'partial')),
    offres_collectees int default 0,
    offres_inserees int default 0,
    offres_ignorees int default 0,
    duree_secondes real,
    erreur text,
    created_at timestamptz default now()
);

create index if not exists idx_collect_logs_date
    on public.collect_logs(created_at desc);

create index if not exists idx_collect_logs_source
    on public.collect_logs(source_nom);

alter table public.collect_logs enable row level security;

create policy "logs_public_read"
    on public.collect_logs for select
    to anon, authenticated using (true);

create policy "logs_public_insert"
    on public.collect_logs for insert
    to anon, authenticated with check (true);`;

  // Affiche le SQL avec indentation
  for (const line of sql.split("\n")) {
    console.log("  " + line);
  }

  console.log("");
  console.log("  Etapes suivantes :");
  console.log("  ---------------------------------------");
  console.log("");
  console.log("  1. Creer la table collect_logs dans Supabase");
  console.log("");
  console.log("  2. Uvicorn redemarre automatiquement");
  console.log("     -> Scheduler demarre");
  console.log("");
  console.log("  3. Verifier le scheduler :");
  console.log("     GET http://127.0.0.1:8000/admin/scheduler/status");
  console.log("");
  console.log("  4. Declencher une collecte manuelle :");
  console.log("     POST http://127.0.0.1:8000/admin/scheduler/trigger");
  console.log("");
  console.log("  5. Voir les logs :");
  console.log("     GET http://127.0.0.1:8000/admin/logs");
  console.log("");
  console.log("  6. Stats 24h :");
  console.log("     GET http://127.0.0.1:8000/admin/logs/stats/24h");
  console.log("");
}

// ==================== Étape 1 : Désinstallation ====================
function stepUninstall() {
  log.section("Desinstallation du module 03");

  let removed = 0;

  for (const file of Object.keys(FILES)) {
    if (!exists(file)) continue;

    if (!OPTIONS.dryRun) {
      removeFile(file);
    }
    log.file(file, "removed");
    removed++;
  }

  // Nettoie main.py
  if (!OPTIONS.dryRun) {
    unpatchMainPy();
  }

  if (!OPTIONS.dryRun) {
    markUninstalled(MODULE_ID);
  }

  log.banner("Module 03 desinstalle");
  console.log("");
  console.log("  Fichiers supprimes :", removed);
  console.log("");
}

// ==================== Étape 2 : Création des fichiers ====================
function stepCreateFiles() {
  log.section(`Creation de ${Object.keys(FILES).length} fichiers`);

  const options = {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  };

  const results = writeFiles(FILES, options);

  for (const detail of results.details) {
    log.file(detail.path, detail.status);
  }

  log.info(
    `-> ${results.created} cree(s), ${results.overwritten} ecrase(s), ${results.skipped} ignore(s)`
  );

  return results;
}

// ==================== Étape 3 : Enregistrement ====================
function stepRegister(results) {
  if (OPTIONS.dryRun) return;

  markInstalled(MODULE_ID, {
    version: MODULE_VERSION,
    installedAt: new Date().toISOString(),
    files: Object.keys(FILES),
    filesCreated: results.created,
    filesOverwritten: results.overwritten,
    filesSkipped: results.skipped,
    patched: ["backend/app/main.py"],
  });

  log.info("Etat enregistre dans _state/installed.json");
}

// ==================== Main ====================
async function main() {
  log.banner("MODULE 03 — SCHEDULER");
  console.log("");
  console.log("  Collecte automatique toutes les 6h");
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN active : aucune modification reelle");
    console.log("");
  }

  // Vérification des prérequis
  if (!OPTIONS.uninstall) {
    if (!validateRequirements(REQUIREMENTS, MODULE_NAME)) {
      console.log("");
      log.info("Installez d'abord les modules 00, 01 et 02 :");
      console.log("    node 00-architecture.js");
      console.log("    node 01-backend-base.js");
      console.log("    node 02-collectors.js");
      console.log("");
      process.exit(1);
    }

    if (isInstalled(MODULE_ID) && !OPTIONS.force) {
      log.warn("Le module 03 est deja installe.");
      log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
      console.log("");
      process.exit(0);
    }
  }

  // Désinstallation
  if (OPTIONS.uninstall) {
    stepUninstall();
    return;
  }

  // Création
  const results = stepCreateFiles();

  log.section("Patch de main.py");
  patchMainPy();

  stepRegister(results);

  // Résumé
  showSummary({
    created: results.created,
    overwritten: results.overwritten,
    skipped: results.skipped,
  });
}

// ==================== Point d'entrée ====================
main().catch((e) => {
  log.error(`Erreur inattendue : ${e.message}`);
  if (OPTIONS.verbose) {
    console.error(e.stack);
  }
  process.exit(1);
});