#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 19 — SOURCES GRATUITES (Google Jobs + Afrique)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute des sources 100% gratuites :
 *   - Google Jobs (via JobSpy)
 *   - MyJobMag (Nigeria)
 *   - Bénin Web TV (Bénin)
 *   - Emploi Sénégal
 *   - Concoursn (Sénégal)
 *
 * FICHIERS CRÉÉS (2) :
 *   backend/app/collectors/google_jobs.py
 *   backend/app/collectors/sources/africa_free.py
 *
 * FICHIERS MODIFIÉS (1) :
 *   backend/requirements.txt
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

const MODULE_ID = "19";
const MODULE_NAME = "Sources gratuites";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/requirements.txt",
  "backend/app/collectors/base.py",
];

// ==================== google_jobs.py ====================

const GOOGLE_JOBS = `"""
Collecteur Google Jobs via JobSpy (gratuit).

JobSpy est une bibliotheque Python open source qui scrape
Google Jobs, LinkedIn, Indeed, Glassdoor, etc.

Repo : https://github.com/speedyapply/JobSpy

Installation :
    pip install python-jobspy
"""

from app.collectors.base import BaseCollector
from app.core.logger import get_logger


logger = get_logger(__name__)


# ==================== Configuration ====================
# Villes africaines principales
AFRICAN_LOCATIONS = [
    "Cotonou, Benin",
    "Lome, Togo",
    "Abidjan, Cote d'Ivoire",
    "Dakar, Senegal",
    "Accra, Ghana",
    "Lagos, Nigeria",
    "Bamako, Mali",
    "Ouagadougou, Burkina Faso",
    "Niamey, Niger",
    "Conakry, Guinee",
]

# Termes de recherche
SEARCH_TERMS = [
    "developer",
    "python developer",
    "data analyst",
    "marketing",
    "accountant",
    "engineer",
]


class GoogleJobsCollector(BaseCollector):
    """
    Collecteur Google Jobs via JobSpy.

    Gratuit et open source.
    """

    def __init__(
        self,
        search_terms: list[str] | None = None,
        locations: list[str] | None = None,
        results_per_query: int = 20,
    ):
        super().__init__()

        self.name = "Google Jobs"
        self.search_terms = search_terms or SEARCH_TERMS[:3]  # 3 termes par defaut
        self.locations = locations or AFRICAN_LOCATIONS[:3]  # 3 villes par defaut
        self.results_per_query = results_per_query

    def collect(self) -> list[dict]:
        """Recupere les offres via JobSpy."""

        try:
            from jobspy import scrape_jobs
        except ImportError:
            self.logger.error(
                "JobSpy non installe. Executez : pip install python-jobspy"
            )
            return []

        all_jobs = []

        for term in self.search_terms:
            for location in self.locations:
                try:
                    self.logger.info(f"Recherche : {term} a {location}")

                    jobs_df = scrape_jobs(
                        site_name=["google"],
                        search_term=term,
                        location=location,
                        results_wanted=self.results_per_query,
                        hours_old=168,  # 7 jours
                        country_indeed="benin",
                    )

                    # Convertit le DataFrame en liste
                    for _, row in jobs_df.iterrows():
                        job = self._parse_row(row, location)
                        if job:
                            all_jobs.append(job)

                except Exception as e:
                    self.logger.warning(
                        f"Erreur {term} / {location} : {e}"
                    )
                    continue

        return all_jobs

    def _parse_row(self, row, location: str) -> dict | None:
        """Parse une ligne du DataFrame JobSpy."""

        titre = str(row.get("title", "")).strip()
        if not titre:
            return None

        url = str(row.get("job_url", "")).strip()
        if not url:
            return None

        # Extrait le pays depuis la localisation
        pays = None
        if "," in location:
            pays = location.split(",")[1].strip()

        return {
            "titre": titre,
            "entreprise": str(row.get("company", "")).strip() or None,
            "pays": pays,
            "ville": str(row.get("location", "")).strip() or None,
            "description": str(row.get("description", "")).strip() or None,
            "type_contrat": str(row.get("job_type", "")).strip() or None,
            "niveau": None,
            "categorie": None,
            "date_publication": str(row.get("date_posted", "")).strip() or None,
            "date_expiration": None,
            "url": url,
            "source": f"Google Jobs ({location})",
            "teletravail": bool(row.get("is_remote", False)),
        }
`;

// ==================== africa_free.py ====================

const AFRICA_FREE = `"""
Sources africaines gratuites supplementaires.

Chaque source est un flux RSS ou un site scrape gracieusement.
"""

from app.collectors.rss_collector import RSSCollector


# ==================== NIGERIA ====================
class MyJobMagRSS(RSSCollector):
    """MyJobMag - Job board nigerian."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.myjobmag.com/rss/jobs",
            source_name="MyJobMag",
            country="Nigeria",
        )


class JobzillaRSS(RSSCollector):
    """Jobzilla Nigeria."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.jobzilla.ng/feed/",
            source_name="Jobzilla",
            country="Nigeria",
        )


# ==================== BENIN ====================
class BeninWebTVRSS(RSSCollector):
    """Benin Web TV - Emploi."""

    def __init__(self):
        super().__init__(
            feed_url="https://beninwebtv.bj/emploi-benin/feed/",
            source_name="Benin Web TV",
            country="Benin",
        )


class BeninIntelligentRSS(RSSCollector):
    """Benin Intelligent - Emploi."""

    def __init__(self):
        super().__init__(
            feed_url="https://beninintelligent.com/feed/",
            source_name="Benin Intelligent",
            country="Benin",
        )


# ==================== SENEGAL ====================
class EmploiSenegalRSS(RSSCollector):
    """Emploi Senegal - RSS WordPress."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.emploisenegal.com/feed/",
            source_name="Emploi Senegal",
            country="Senegal",
        )


class ConcoursnRSS(RSSCollector):
    """Concoursn - Concours et emplois au Senegal."""

    def __init__(self):
        super().__init__(
            feed_url="https://concoursn.com/feed/",
            source_name="Concoursn Senegal",
            country="Senegal",
        )


# ==================== COTE D'IVOIRE ====================
class EmploiCIRSS(RSSCollector):
    """Emploi Cote d'Ivoire - RSS."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.emploi.ci/feed/",
            source_name="Emploi Cote d'Ivoire",
            country="Cote d'Ivoire",
        )


class ProjobivoireRSS(RSSCollector):
    """Projobivoire - RSS."""

    def __init__(self):
        super().__init__(
            feed_url="https://projobivoire.com/feed/",
            source_name="Projobivoire",
            country="Cote d'Ivoire",
        )


# ==================== REGISTRE ====================
ALL_AFRICA_FREE_SOURCES = [
    # Nigeria
    MyJobMagRSS,
    JobzillaRSS,

    # Benin
    BeninWebTVRSS,
    BeninIntelligentRSS,

    # Senegal
    EmploiSenegalRSS,
    ConcoursnRSS,

    # Cote d'Ivoire
    EmploiCIRSS,
    ProjobivoireRSS,
]
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/collectors/google_jobs.py": GOOGLE_JOBS,
  "backend/app/collectors/sources/africa_free.py": AFRICA_FREE,
};

// ==================== Patch requirements.txt ====================

function patchRequirements() {
  const reqPath = "backend/requirements.txt";
  const fullPath = path.join(ROOT, reqPath);

  if (!fs.existsSync(fullPath)) {
    log.error("requirements.txt introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("python-jobspy")) {
    log.info("requirements.txt deja patche");
    return true;
  }

  // Ajoute jobspy
  const newPackages = [
    "",
    "# ==================== JOB SPY (Google Jobs) ====================",
    "python-jobspy==1.1.75",
    "",
  ].join("\\n");

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content + newPackages, "utf8");
  }

  log.file(reqPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch relay_rss.py (ajoute sources africaines) ====================

function patchRelayRss() {
  const relayPath = "backend/app/collectors/sources/relay_rss.py";
  const fullPath = path.join(ROOT, relayPath);

  if (!fs.existsSync(fullPath)) {
    log.error("relay_rss.py introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("africa_free")) {
    log.info("relay_rss.py deja patche");
    return true;
  }

  // Ajoute l'import en haut
  content = content.replace(
    /^from app\\.collectors\\.rss_collector import RSSCollector/,
    'from app.collectors.rss_collector import RSSCollector\\nfrom app.collectors.sources.africa_free import ALL_AFRICA_FREE_SOURCES'
  );

  // Ajoute les sources africaines dans ALL_SOURCES
  content = content.replace(
    /ALL_SOURCES = \[/,
    'ALL_SOURCES = ALL_AFRICA_FREE_SOURCES + ['
  );

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(relayPath + " (patché)", "overwritten");
  return true;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 19 — SOURCES GRATUITES");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller.");
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

  log.section("Creation de " + Object.keys(FILES).length + " fichiers");

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s)"
  );

  log.section("Patch de requirements.txt");
  patchRequirements();

  log.section("Patch de relay_rss.py");
  patchRelayRss();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
      patched: [
        "backend/requirements.txt",
        "backend/app/collectors/sources/relay_rss.py",
      ],
    });
  }

  log.banner("MODULE 19 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Nouvelles sources :");
  console.log("  - Google Jobs (via JobSpy)");
  console.log("  - MyJobMag (Nigeria)");
  console.log("  - Jobzilla (Nigeria)");
  console.log("  - Benin Web TV (Benin)");
  console.log("  - Benin Intelligent (Benin)");
  console.log("  - Emploi Senegal (Senegal)");
  console.log("  - Concoursn (Senegal)");
  console.log("  - Emploi CI (Cote d'Ivoire)");
  console.log("  - Projobivoire (Cote d'Ivoire)");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Installer JobSpy :");
  console.log("     cd backend");
  console.log("     pip install python-jobspy");
  console.log("");
  console.log("  2. Relancer une collecte :");
  console.log("     python -m scripts.run_collect");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});