#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 05 — COLLECTEUR API (ProGigFinder + Fuzu)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute la collecte d'offres depuis des APIs JSON publiques,
 * sans RSS ni scraping HTML.
 *
 * Sources :
 *   - ProGigFinder (✅ vérifié — 200 OK, JSON structuré)
 *   - Fuzu (🟡 nécessite proxy pour éviter 403)
 *
 * USAGE :
 *   node 05-api-collector.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle
 *   --dry-run        Simule
 *   --uninstall      Désinstalle
 *
 * FICHIERS CRÉÉS (5) :
 *   backend/app/collectors/api/__init__.py
 *   backend/app/collectors/api/base_api.py
 *   backend/app/collectors/api/progigfinder.py
 *   backend/app/collectors/api/fuzu.py
 *   backend/app/collectors/api/sources.py
 *   backend/app/api/collect_api.py
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

const MODULE_ID = "05";
const MODULE_NAME = "Collecteur API";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/job_service.py",
  "backend/app/services/normalizer.py",
];

// ==================== Contenu des fichiers ====================

const API_INIT = `"""
Collecteurs API JSON.

Ce module gere les sources qui exposent une API REST publique
(JSON), sans RSS ni scraping HTML.

Sources :
    - ProGigFinder (Afrique)
    - Fuzu (Afrique de l'Est / Ouest)
"""
`;

const BASE_API = `"""
Classe de base pour les collecteurs API.
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseAPICollector(ABC):
    """
    Classe abstraite pour les collecteurs API JSON.

    Attributs a definir :
        name        : Nom de la source
        api_url     : URL de l'API
        country     : Pays par defaut
    """

    name: str = "base_api"
    api_url: str = ""
    country: str | None = None

    def __init__(self):
        self.logger = get_logger(f"collector.api.{self.name}")

    @abstractmethod
    def collect(self) -> list[dict]:
        """Recupere les offres depuis l'API."""
        pass

    def safe_collect(self) -> list[dict]:
        """Wrapper avec gestion d'erreur."""

        try:
            self.logger.info(f"Collecte API : {self.name}")
            jobs = self.collect()
            self.logger.info(f"{len(jobs)} offre(s) depuis {self.name}")
            return jobs

        except Exception as e:
            self.logger.error(f"Erreur API {self.name} : {e}")
            return []
`;

const PROGIGFINDER = `"""
Collecteur ProGigFinder.

API : https://www.progigfinder.com/api/feed/jobs?format=json
Aucune cle requise. Retourne du JSON structure.

Champs disponibles :
    id, title, company, location, country, city,
    is_remote, job_type, category, experience_level,
    salary, description
"""

import httpx

from app.collectors.api.base_api import BaseAPICollector
from app.services.normalizer import clean_text


# ==================== Mapping type de contrat ====================
JOB_TYPE_MAP = {
    "full_time": "CDI",
    "part_time": "Temps partiel",
    "contract": "CDD",
    "temporary": "CDD",
    "internship": "Stage",
    "freelance": "Freelance",
    "volunteer": "Bénévolat",
}


# ==================== Mapping niveau ====================
EXPERIENCE_MAP = {
    "entry": "Junior",
    "junior": "Junior",
    "mid": "Mid",
    "mid_level": "Mid",
    "senior": "Senior",
    "lead": "Senior",
    "executive": "Senior",
    "director": "Senior",
}


class ProGigFinderCollector(BaseAPICollector):
    """
    Collecteur ProGigFinder (Afrique).

    Retourne des offres d'Afrique (Uganda, Kenya, Nigeria, Ghana,
    Afrique du Sud, et 30+ autres pays).
    """

    name = "ProGigFinder"
    api_url = "https://www.progigfinder.com/api/feed/jobs?format=json"

    def __init__(self):
        super().__init__()

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API ProGigFinder."""

        headers = {
            "User-Agent": "JobAfricaBot/1.0",
            "Accept": "application/json",
        }

        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.get(self.api_url, headers=headers)
            response.raise_for_status()
            data = response.json()

        # La structure peut etre :
        # - Une liste directe
        # - Un dict avec une cle "jobs" ou "data"
        if isinstance(data, list):
            jobs_data = data
        elif isinstance(data, dict):
            jobs_data = (
                data.get("jobs")
                or data.get("data")
                or data.get("results")
                or []
            )
        else:
            jobs_data = []

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre ProGigFinder."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        # Construit une URL canonique a partir de l'ID
        job_id = item.get("id")
        url = (
            f"https://www.progigfinder.com/jobs/{job_id}"
            if job_id else None
        )

        if not url:
            return None

        # Type de contrat
        job_type = (item.get("job_type") or "").lower().strip()
        type_contrat = JOB_TYPE_MAP.get(job_type)

        # Niveau
        exp_level = (item.get("experience_level") or "").lower().strip()
        niveau = EXPERIENCE_MAP.get(exp_level)

        # Teletravail
        teletravail = bool(item.get("is_remote", False))

        return {
            "titre": titre,
            "entreprise": clean_text(item.get("company")),
            "pays": clean_text(item.get("country")),
            "ville": clean_text(item.get("city")),
            "description": clean_text(item.get("description")),
            "type_contrat": type_contrat,
            "niveau": niveau,
            "categorie": clean_text(item.get("category")),
            "date_publication": None,
            "date_expiration": None,
            "url": url,
            "source": "ProGigFinder",
            "teletravail": teletravail,
        }
`;

const FUZU = `"""
Collecteur Fuzu.

API : https://www.fuzu.com/api/all_jobs
⚠️ Retourne 403 sans proxy. Utiliser un proxy Vercel ou un User-Agent dedie.

Fuzu est present au Kenya, Ouganda, Nigeria, Ghana, Malawi.
"""

import os
import httpx

from app.collectors.api.base_api import BaseAPICollector
from app.services.normalizer import clean_text


class FuzuCollector(BaseAPICollector):
    """
    Collecteur Fuzu (Afrique de l'Est / Ouest).

    ⚠️ Necessite un proxy si 403.
    Configurer la variable d'environnement FUZU_PROXY_URL
    pour utiliser un proxy Vercel :
        FUZU_PROXY_URL=https://ton-proxy.vercel.app
    """

    name = "Fuzu"
    api_url = "https://www.fuzu.com/api/all_jobs"

    def __init__(self):
        super().__init__()

        # Proxy optionnel (Vercel, Cloudflare Worker, etc.)
        self.proxy_url = os.getenv("FUZU_PROXY_URL", "").strip()

    def collect(self) -> list[dict]:
        """Recupere les offres via l'API Fuzu."""

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
        }

        # Utilise le proxy si configure
        if self.proxy_url:
            url = f"{self.proxy_url.rstrip('/')}/{self.api_url}"
        else:
            url = self.api_url

        with httpx.Client(timeout=30, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

        # Fuzu retourne {"fuzu_api": [ ... ]}
        if isinstance(data, dict):
            jobs_data = data.get("fuzu_api") or data.get("jobs") or []
        elif isinstance(data, list):
            jobs_data = data
        else:
            jobs_data = []

        jobs = []

        for item in jobs_data:
            job = self._parse_job(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_job(self, item: dict) -> dict | None:
        """Parse une offre Fuzu."""

        titre = clean_text(item.get("title"))
        if not titre:
            return None

        # URL de l'offre
        slug = item.get("slug")
        job_id = item.get("id")

        if slug:
            url = f"https://www.fuzu.com/job/{slug}"
        elif job_id:
            url = f"https://www.fuzu.com/job/{job_id}"
        else:
            return None

        # Localisation
        pays = clean_text(item.get("country"))
        ville = clean_text(item.get("city"))

        # Teletravail
        teletravail = bool(item.get("is_remote", False))

        return {
            "titre": titre,
            "entreprise": clean_text(item.get("employer_name")),
            "pays": pays,
            "ville": ville,
            "description": clean_text(item.get("description")),
            "type_contrat": clean_text(item.get("job_type")),
            "niveau": None,
            "categorie": None,
            "date_publication": item.get("created_at"),
            "date_expiration": None,
            "url": url,
            "source": "Fuzu",
            "teletravail": teletravail,
        }
`;

const SOURCES = `"""
Registre des sources API.

Sources actives :
    - ProGigFinder (✅ verifie)
    - Fuzu (🟡 necessite proxy)

Pour desactiver une source temporairement :
commenter sa ligne dans ALL_API_SOURCES.
"""

from app.collectors.api.progigfinder import ProGigFinderCollector
from app.collectors.api.fuzu import FuzuCollector


ALL_API_SOURCES = [
    ProGigFinderCollector,
    FuzuCollector,
]


def get_api_sources_summary() -> list[dict]:
    """Retourne un resume des sources API configurees."""
    summary = []

    for CollectorClass in ALL_API_SOURCES:
        try:
            collector = CollectorClass()
            summary.append({
                "name": collector.name,
                "api_url": collector.api_url,
                "country": getattr(collector, "country", None),
                "type": "api",
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

const COLLECT_API = `"""
Routes API pour la collecte via APIs JSON.

Separe de collect.py, collect_ats.py et collect_scrapers.py.
"""

from fastapi import APIRouter

from app.core.logger import get_logger
from app.collectors.api.sources import (
    ALL_API_SOURCES,
    get_api_sources_summary,
)
from app.services.job_service import bulk_create_jobs


logger = get_logger(__name__)

router = APIRouter(prefix="/collect/api", tags=["collect-api"])


@router.get("/sources", summary="Liste des sources API")
def list_api_sources():
    """Retourne la liste des APIs configurees."""
    return get_api_sources_summary()


@router.post("/run", summary="Lancer une collecte API")
def collect_api():
    """
    Lance tous les collecteurs API et insere les offres en base.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for CollectorClass in ALL_API_SOURCES:
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
                f"API {collector.name} : "
                f"{collected} collectees, {inserted} inserees"
            )

        except Exception as e:
            total_errors += 1
            details.append({
                "source": collector.name,
                "status": "error",
                "error": str(e)[:200],
            })
            logger.error(f"API {collector.name} : {e}")

    return {
        "message": "Collecte API terminee",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "details": details,
    }
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/collectors/api/__init__.py": API_INIT,
  "backend/app/collectors/api/base_api.py": BASE_API,
  "backend/app/collectors/api/progigfinder.py": PROGIGFINDER,
  "backend/app/collectors/api/fuzu.py": FUZU,
  "backend/app/collectors/api/sources.py": SOURCES,
  "backend/app/api/collect_api.py": COLLECT_API,
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

  if (content.includes("collect_api")) {
    log.info("main.py deja patche (collect_api present)");
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
        pattern + ", collect_api"
      );
      modified = true;
      break;
    }
  }

  // Patch include_router
  const includePatterns = [
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
        pattern + "\napp.include_router(collect_api.router)"
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
  log.banner("MODULE 05 — COLLECTEUR API");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    console.log("");
    log.info("Installez d'abord les modules 00, 01, 02 :");
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
    log.banner("MODULE 05 — DESINSTALLE");
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

  log.banner("MODULE 05 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Uvicorn redemarre automatiquement");
  console.log("  2. Tester : GET /collect/api/sources");
  console.log("  3. Lancer : POST /collect/api/run");
  console.log("");
  console.log("  Note : Fuzu peut retourner 403. Utiliser un proxy Vercel");
  console.log("         en definissant FUZU_PROXY_URL dans .env");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});