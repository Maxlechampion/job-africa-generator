#!/usr/bin/env node

/**
 * MODULE 03.5 — COLLECTEUR ATS (Greenhouse + Ashby)
 *
 * Ajoute la collecte d'offres depuis les APIs publiques
 * d'ATS (Greenhouse, Ashby) sans clé ni authentification.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const MODULE_ID = "03.5";
const MODULE_NAME = "Collecteur ATS";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/job_service.py",
  "backend/app/services/normalizer.py",
];

// ==================== Contenu des fichiers ====================

const ATS_INIT = `"""
Collecteurs ATS (Applicant Tracking Systems).

Greenhouse et Ashby exposent des APIs publiques, sans cle,
qui renvoient les offres d'emploi des entreprises qui les utilisent.

Ce module est independant des collecteurs RSS (relay_rss.py).
"""
`;

const ATS_BASE = `"""
Classe de base pour les collecteurs ATS.
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseATSCollector(ABC):
    """
    Classe abstraite pour les collecteurs ATS.

    Chaque ATS (Greenhouse, Ashby) implemente sa propre logique
    de parsing mais partage la meme interface.
    """

    name: str = "base_ats"
    ats_type: str = "ats"

    def __init__(self):
        self.logger = get_logger(f"collector.ats.{self.name}")

    @abstractmethod
    def collect(self) -> list[dict]:
        """Recupere les offres depuis l'API de l'ATS."""
        pass

    def safe_collect(self) -> list[dict]:
        """Wrapper avec gestion d'erreur."""

        try:
            self.logger.info(f"Collecte ATS : {self.name}")
            jobs = self.collect()
            self.logger.info(f"{len(jobs)} offre(s) depuis {self.name}")
            return jobs

        except Exception as e:
            self.logger.error(f"Erreur ATS {self.name} : {e}")
            return []
`;

const GREENHOUSE = `"""
Collecteur Greenhouse.

API publique : https://boards-api.greenhouse.io/v1/boards/{token}/jobs
Aucune cle requise.

Reference : https://developers.greenhouse.io/job-board.html
"""

import httpx

from app.collectors.ats.base_ats import BaseATSCollector
from app.services.normalizer import clean_text, parse_date


class GreenhouseCollector(BaseATSCollector):
    """
    Collecteur pour les entreprises utilisant Greenhouse.

    Attributs :
        token       : Token du board (ex: "moniepoint")
        source_name : Nom affiche de la source
        country     : Pays par defaut (optionnel)
    """

    def __init__(
        self,
        token: str,
        source_name: str,
        country: str | None = None,
    ):
        super().__init__()

        self.token = token
        self.source_name = source_name
        self.country = country
        self.name = source_name
        self.ats_type = "greenhouse"

        self.api_url = (
            f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
        )

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Greenhouse."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        with httpx.Client(timeout=20, follow_redirects=True) as client:
            response = client.get(self.api_url, headers=headers)
            response.raise_for_status()
            data = response.json()

        jobs_data = data.get("jobs", [])

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Greenhouse."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        url = item.get("absolute_url")
        if not url:
            return None

        location = item.get("location") or {}
        location_name = location.get("name") if isinstance(location, dict) else None

        teletravail = False
        if location_name:
            location_lower = location_name.lower()
            teletravail = any(
                kw in location_lower
                for kw in ["remote", "anywhere", "teletravail", "distanciel"]
            )

        updated = item.get("updated_at") or item.get("first_published")

        return {
            "titre": titre,
            "entreprise": self.source_name,
            "pays": self.country,
            "ville": location_name,
            "description": None,
            "type_contrat": None,
            "niveau": None,
            "categorie": None,
            "date_publication": parse_date(updated),
            "date_expiration": None,
            "url": url,
            "source": f"{self.source_name} (Greenhouse)",
            "teletravail": teletravail,
        }
`;

const ASHBY = `"""
Collecteur Ashby.

API publique : https://api.ashbyhq.com/posting-api/job-board/{name}
Aucune cle requise.

Reference : https://developers.ashbyhq.com/docs/public-job-posting-api
"""

import httpx

from app.collectors.ats.base_ats import BaseATSCollector
from app.services.normalizer import clean_text, parse_date


class AshbyCollector(BaseATSCollector):
    """
    Collecteur pour les entreprises utilisant Ashby.

    Attributs :
        board_name  : Nom du board (ex: "andela")
        source_name : Nom affiche de la source
        country     : Pays par defaut (optionnel)
    """

    def __init__(
        self,
        board_name: str,
        source_name: str,
        country: str | None = None,
    ):
        super().__init__()

        self.board_name = board_name
        self.source_name = source_name
        self.country = country
        self.name = source_name
        self.ats_type = "ashby"

        self.api_url = (
            f"https://api.ashbyhq.com/posting-api/job-board/{board_name}"
        )

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Ashby."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        with httpx.Client(timeout=20, follow_redirects=True) as client:
            response = client.get(self.api_url, headers=headers)
            response.raise_for_status()
            data = response.json()

        jobs_data = data.get("jobs", [])

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Ashby."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        url = item.get("jobUrl") or item.get("applyUrl")
        if not url:
            return None

        location = item.get("location")
        if isinstance(location, dict):
            location = location.get("location") or location.get("name")

        teletravail = bool(item.get("isRemote", False))
        if not teletravail and location:
            location_lower = str(location).lower()
            teletravail = any(
                kw in location_lower
                for kw in ["remote", "anywhere", "teletravail"]
            )

        published = item.get("publishedAt")

        return {
            "titre": titre,
            "entreprise": self.source_name,
            "pays": self.country,
            "ville": location if isinstance(location, str) else None,
            "description": None,
            "type_contrat": None,
            "niveau": None,
            "categorie": None,
            "date_publication": parse_date(published),
            "date_expiration": None,
            "url": url,
            "source": f"{self.source_name} (Ashby)",
            "teletravail": teletravail,
        }
`;

const ATS_SOURCES = `"""
Registre des entreprises africaines utilisant Greenhouse ou Ashby.

Ces entreprises publient leurs offres via des APIs publiques,
sans cle ni authentification.

Verifier regulierement que les tokens sont toujours valides.
"""

from app.collectors.ats.greenhouse import GreenhouseCollector
from app.collectors.ats.ashby import AshbyCollector


# ==================== Greenhouse ====================

class MoniepointGreenhouse(GreenhouseCollector):
    """
    Moniepoint - Fintech nigeriane (Lagos).

    API : https://boards-api.greenhouse.io/v1/boards/moniepoint/jobs
    """
    def __init__(self):
        super().__init__(
            token="moniepoint",
            source_name="Moniepoint",
            country="Nigeria",
        )


class JumiaGreenhouse(GreenhouseCollector):
    """
    Jumia - E-commerce panafricain.

    API : https://boards-api.greenhouse.io/v1/boards/jumia/jobs
    """
    def __init__(self):
        super().__init__(
            token="jumia",
            source_name="Jumia",
        )


# ==================== Ashby ====================

class AndelaAshby(AshbyCollector):
    """
    Andela - Talent marketplace africain.

    API : https://api.ashbyhq.com/posting-api/job-board/andela
    """
    def __init__(self):
        super().__init__(
            board_name="andela",
            source_name="Andela",
        )


# ==================== Registre ====================

ALL_ATS_SOURCES = [
    MoniepointGreenhouse,
    JumiaGreenhouse,
    AndelaAshby,
]


def get_ats_sources_summary() -> list[dict]:
    """Retourne un resume des sources ATS configurees."""
    summary = []

    for CollectorClass in ALL_ATS_SOURCES:
        try:
            collector = CollectorClass()
            summary.append({
                "name": collector.name,
                "ats_type": collector.ats_type,
                "country": getattr(collector, "country", None),
                "api_url": getattr(collector, "api_url", None),
                "status": "active",
            })
        except Exception as e:
            summary.append({
                "name": CollectorClass.__name__,
                "error": str(e),
                "status": "error",
            })

    return summary
`;

const COLLECT_ATS_API = `"""
Routes API pour la collecte ATS.

Separe de collect.py pour ne pas impacter les collecteurs RSS existants.
"""

from fastapi import APIRouter

from app.core.logger import get_logger
from app.collectors.ats.sources import (
    ALL_ATS_SOURCES,
    get_ats_sources_summary,
)
from app.services.job_service import bulk_create_jobs


logger = get_logger(__name__)

router = APIRouter(prefix="/collect/ats", tags=["collect-ats"])


@router.get("/sources", summary="Liste des sources ATS")
def list_ats_sources():
    """Retourne la liste des entreprises ATS configurees."""
    return get_ats_sources_summary()


@router.post("/run", summary="Lancer une collecte ATS")
def collect_ats():
    """
    Lance tous les collecteurs ATS et insere les offres en base.

    Separe de POST /admin/scheduler/trigger pour permettre
    de tester les ATS independamment des RSS.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for CollectorClass in ALL_ATS_SOURCES:
        collector = CollectorClass()

        try:
            jobs = collector.collect()
            collected = len(jobs)

            if collected == 0:
                details.append({
                    "source": collector.name,
                    "status": "empty",
                    "collected": 0,
                })
                continue

            result = bulk_create_jobs(jobs)

            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            details.append({
                "source": collector.name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
            })

            logger.info(
                f"ATS {collector.name} : "
                f"{collected} collectees, {inserted} inserees"
            )

        except Exception as e:
            total_errors += 1
            details.append({
                "source": collector.name,
                "status": "error",
                "error": str(e)[:200],
            })
            logger.error(f"ATS {collector.name} : {e}")

    return {
        "message": "Collecte ATS terminee",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "details": details,
    }
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/collectors/ats/__init__.py": ATS_INIT,
  "backend/app/collectors/ats/base_ats.py": ATS_BASE,
  "backend/app/collectors/ats/greenhouse.py": GREENHOUSE,
  "backend/app/collectors/ats/ashby.py": ASHBY,
  "backend/app/collectors/ats/sources.py": ATS_SOURCES,
  "backend/app/api/collect_ats.py": COLLECT_ATS_API,
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

  if (content.includes("collect_ats")) {
    log.info("main.py deja patche (collect_ats present)");
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
  if (content.includes("from app.api import jobs, stats, collect, admin")) {
    content = content.replace(
      "from app.api import jobs, stats, collect, admin",
      "from app.api import jobs, stats, collect, admin, collect_ats"
    );
    modified = true;
  } else if (content.includes("from app.api import jobs, stats, collect")) {
    content = content.replace(
      "from app.api import jobs, stats, collect",
      "from app.api import jobs, stats, collect, collect_ats"
    );
    modified = true;
  } else if (content.includes("from app.api import jobs, stats")) {
    content = content.replace(
      "from app.api import jobs, stats",
      "from app.api import jobs, stats, collect_ats"
    );
    modified = true;
  }

  // Patch include_router
  if (content.includes("app.include_router(admin.router)")) {
    content = content.replace(
      "app.include_router(admin.router)",
      "app.include_router(admin.router)\napp.include_router(collect_ats.router)"
    );
    modified = true;
  } else if (content.includes("app.include_router(collect.router)")) {
    content = content.replace(
      "app.include_router(collect.router)",
      "app.include_router(collect.router)\napp.include_router(collect_ats.router)"
    );
    modified = true;
  } else if (content.includes("app.include_router(stats.router)")) {
    content = content.replace(
      "app.include_router(stats.router)",
      "app.include_router(stats.router)\napp.include_router(collect_ats.router)"
    );
    modified = true;
  }

  if (modified && !OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
    log.file(mainPath + " (patché)", "overwritten");
    return true;
  }

  if (!modified) {
    log.warn("Aucune modification apportee a main.py");
    log.info("Ajoutez manuellement :");
    console.log("  from app.api import ..., collect_ats");
    console.log("  app.include_router(collect_ats.router)");
  }

  return modified;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 03.5 — COLLECTEUR ATS");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
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
    log.success("Module desinstalle.");
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

  // Patch main.py
  log.section("Patch de main.py");
  patchMainPy();

  // Enregistrement
  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 03.5 — TERMINE");
  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Uvicorn redemarre automatiquement");
  console.log("  2. Tester : GET /collect/ats/sources");
  console.log("  3. Lancer : POST /collect/ats/run");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});