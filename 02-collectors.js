#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 02 — COLLECTEURS (RSS + HTML)
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute la couche de collecte d'offres d'emploi depuis
 * plusieurs sources africaines et internationales :
 *
 *   - Collecteur RSS générique (feedparser)
 *   - Scraper HTML générique (httpx + BeautifulSoup)
 *   - Sources réelles :
 *       • Emploi Afrique (RSS)
 *       • Sénégal Emploi (RSS)
 *       • RemoteOK (RSS)
 *       • WeWorkRemotely (RSS)
 *   - Endpoint POST /collect (collecte manuelle)
 *
 * USAGE :
 *   node 02-collectors.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle (écrase les fichiers, backup auto)
 *   --dry-run        Simule sans écrire sur le disque
 *   --skip-existing  Ignore les fichiers déjà présents
 *   --uninstall      Désinstalle le module
 *   --verbose        Affiche plus de détails
 *
 * EXEMPLES :
 *   node 02-collectors.js
 *   node 02-collectors.js --dry-run
 *   node 02-collectors.js --force
 *   node 02-collectors.js --uninstall
 *
 * PRÉREQUIS :
 *   - Module 00 (architecture) installé
 *   - Module 01 (backend base) installé
 *     Vérifie la présence de : backend/app/services, backend/app/api,
 *     backend/app/core/supabase.py, backend/app/schemas/job.py
 *
 * DÉPENDANCES (déjà dans requirements.txt du module 01) :
 *   - feedparser
 *   - httpx
 *   - beautifulsoup4
 *   - lxml
 *
 * FICHIERS CRÉÉS (7) :
 *   backend/app/collectors/__init__.py
 *   backend/app/collectors/base.py
 *   backend/app/collectors/rss_collector.py
 *   backend/app/collectors/scraper.py
 *   backend/app/collectors/sources/__init__.py
 *   backend/app/collectors/sources/relay_rss.py
 *   backend/app/api/collect.py
 *
 * FICHIERS MODIFIÉS (1) :
 *   backend/app/main.py  (ajout du router collect)
 *
 * ÉTAT ENREGISTRÉ :
 *   _state/installed.json → {modules: {"02": {...}}}
 *
 * ROLLBACK :
 *   node 02-collectors.js --uninstall
 *
 * APRÈS INSTALLATION :
 *   1. Uvicorn détecte les changements automatiquement
 *   2. Tester la collecte manuelle :
 *        → Ouvrir http://127.0.0.1:8000/docs
 *        → POST /collect  → Try it out → Execute
 *   3. Les offres sont récupérées et insérées en base
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

// ==================== Parse des arguments CLI ====================
const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  skipExisting: args.includes("--skip-existing"),
  uninstall: args.includes("--uninstall"),
  verbose: args.includes("--verbose"),
};

// ==================== Constantes du module ====================
const MODULE_ID = "02";
const MODULE_NAME = "Collecteurs";
const MODULE_VERSION = "1.0.0";

// ==================== Prérequis ====================
const REQUIREMENTS = [
  "backend/app/services",
  "backend/app/api",
  "backend/app/core/supabase.py",
  "backend/app/schemas/job.py",
  "backend/app/main.py",
];

// ==================== Fichiers du module ====================
const FILES = {
  // ═══════════════════════════════════════════════════════════════
  // 1. backend/app/collectors/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/collectors/__init__.py": `
"""
Collecteurs d'offres d'emploi.

Ce package contient :
    - base.py              → Classe abstraite BaseCollector
    - rss_collector.py     → Collecteur RSS générique
    - scraper.py           → Scraper HTML générique
    - sources/             → Sources concrètes (une par fichier)

Pour ajouter une nouvelle source :
    1. Créer un fichier dans sources/
    2. Hériter de RSSCollector ou HTMLScraper
    3. Ajouter la classe dans backend/app/api/collect.py
"""
`,

  // ═══════════════════════════════════════════════════════════════
  // 2. backend/app/collectors/base.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/collectors/base.py": `
"""
Classe de base pour tous les collecteurs.

Chaque collecteur doit hériter de BaseCollector et
implémenter la méthode collect().

Fonctionnalités :
    - safe_collect() : wrapper avec gestion d'erreur
    - Logging automatique
    - Compteur d'offres collectées
"""

from abc import ABC, abstractmethod

from app.core.logger import get_logger


class BaseCollector(ABC):
    """
    Classe abstraite pour tous les collecteurs.

    Attributs à définir dans les sous-classes :
        name    : Nom de la source (ex: "Emploi Afrique")
        country : Pays ciblé (optionnel)
        pays    : Alias de country
    """

    name: str = "base"
    country: str | None = None
    pays: str | None = None

    def __init__(self):
        """Initialise le logger du collecteur."""

        self.logger = get_logger(f"collector.{self.name}")
        self.jobs_collected = 0

    @abstractmethod
    def collect(self) -> list[dict]:
        """
        Récupère des offres depuis une source.

        Doit retourner une liste de dictionnaires avec les clés :
            titre, entreprise, pays, ville, description,
            type_contrat, niveau, categorie, date_publication,
            date_expiration, url, source, teletravail

        Returns:
            Liste d'offres (dict)
        """

        pass

    def safe_collect(self) -> list[dict]:
        """
        Wrapper avec gestion d'erreur.

        Ne lève jamais d'exception : retourne une liste vide en cas d'erreur.

        Returns:
            Liste d'offres (vide si erreur)
        """

        try:
            self.logger.info(f"Démarrage de la collecte : {self.name}")

            jobs = self.collect()

            self.jobs_collected = len(jobs)

            self.logger.info(
                f"Collecte terminée : {len(jobs)} offre(s) "
                f"depuis {self.name}"
            )

            return jobs

        except Exception as e:
            self.logger.error(
                f"Erreur de collecte depuis {self.name} : {e}"
            )
            return []
`,

  // ═══════════════════════════════════════════════════════════════
  // 3. backend/app/collectors/rss_collector.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/collectors/rss_collector.py": `
"""
Collecteur RSS générique.

Utilise feedparser pour parser un flux RSS et extraire
les offres d'emploi.

Exemple d'utilisation :
    collector = RSSCollector(
        feed_url="https://example.com/rss.xml",
        source_name="Ma Source",
        country="Bénin",
    )
    jobs = collector.safe_collect()
"""

import httpx
import feedparser

from app.collectors.base import BaseCollector
from app.services.normalizer import parse_date


# ==================== Configuration ====================
USER_AGENT = (
    "Mozilla/5.0 (compatible; JobAfricaBot/1.0; "
    "+https://job-africa.vercel.app)"
)
DEFAULT_TIMEOUT = 15


class RSSCollector(BaseCollector):
    """
    Collecteur générique pour flux RSS.

    Attributs :
        feed_url   : URL du flux RSS
        source_name : Nom de la source (pour le champ "source")
        country     : Pays par défaut (optionnel)
        categorie   : Catégorie par défaut (optionnel)
    """

    def __init__(
        self,
        feed_url: str,
        source_name: str,
        country: str | None = None,
        categorie: str | None = None,
    ):
        super().__init__()

        self.feed_url = feed_url
        self.source_name = source_name
        self.country = country
        self.pays = country
        self.categorie = categorie

        # Le nom du collecteur est le nom de la source
        self.name = source_name

    def collect(self) -> list[dict]:
        """
        Récupère et parse le flux RSS.

        Returns:
            Liste d'offres normalisées
        """

        # ==================== Téléchargement ====================
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/xml, text/xml",
        }

        with httpx.Client(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = client.get(self.feed_url)
            response.raise_for_status()
            content = response.content

        # ==================== Parsing ====================
        feed = feedparser.parse(content)

        if not feed.entries:
            self.logger.warning(f"Aucune entrée dans le flux : {self.feed_url}")
            return []

        # ==================== Extraction ====================
        jobs = []

        for entry in feed.entries:
            job = self._parse_entry(entry)
            if job:
                jobs.append(job)

        return jobs

    def _parse_entry(self, entry) -> dict | None:
        """
        Parse une entrée RSS en offre normalisée.

        Args:
            entry : Entrée feedparser

        Returns:
            Offre (dict) ou None si invalide
        """

        # Titre obligatoire
        titre = entry.get("title", "").strip()
        if not titre:
            return None

        # URL obligatoire
        url = entry.get("link", "").strip()
        if not url:
            return None

        # Description
        description = (
            entry.get("summary")
            or entry.get("description")
            or ""
        )

        # Date de publication
        date_pub = entry.get("published") or entry.get("updated")

        # Entreprise (parfois dans author)
        entreprise = entry.get("author") or None

        return {
            "titre": titre,
            "entreprise": entreprise,
            "pays": self.country,
            "ville": None,
            "description": description,
            "type_contrat": None,
            "niveau": None,
            "categorie": self.categorie,
            "date_publication": parse_date(date_pub),
            "date_expiration": None,
            "url": url,
            "source": self.source_name,
            "teletravail": False,
        }
`,

  // ═══════════════════════════════════════════════════════════════
  // 4. backend/app/collectors/scraper.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/collectors/scraper.py": `
"""
Scraper HTML générique.

Utilise httpx + BeautifulSoup pour extraire les offres
depuis une page HTML.

Utilisation :
    scraper = HTMLScraper(
        url="https://example.com/jobs",
        source_name="Ma Source",
        selectors={
            "item": "div.job-card",
            "titre": "h2.job-title",
            "url": "a.job-link",
            "description": "p.job-desc",
        },
        base_url="https://example.com",
    )
    jobs = scraper.safe_collect()
"""

import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from app.collectors.base import BaseCollector


# ==================== Configuration ====================
USER_AGENT = (
    "Mozilla/5.0 (compatible; JobAfricaBot/1.0; "
    "+https://job-africa.vercel.app)"
)
DEFAULT_TIMEOUT = 15


class HTMLScraper(BaseCollector):
    """
    Scraper HTML générique.

    Attributs :
        url        : URL de la page à scraper
        source_name : Nom de la source
        selectors  : Dict de sélecteurs CSS
                     {item, titre, url, description}
        base_url   : URL de base pour les liens relatifs
        country    : Pays par défaut (optionnel)
    """

    def __init__(
        self,
        url: str,
        source_name: str,
        selectors: dict,
        base_url: str = "",
        country: str | None = None,
    ):
        super().__init__()

        self.url = url
        self.source_name = source_name
        self.selectors = selectors
        self.base_url = base_url
        self.country = country
        self.pays = country
        self.name = source_name

    def collect(self) -> list[dict]:
        """
        Récupère et parse la page HTML.

        Returns:
            Liste d'offres normalisées
        """

        # ==================== Téléchargement ====================
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        }

        with httpx.Client(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            response = client.get(self.url)
            response.raise_for_status()

        # ==================== Parsing ====================
        soup = BeautifulSoup(response.text, "lxml")

        items = soup.select(self.selectors["item"])

        if not items:
            self.logger.warning(
                f"Aucun élément trouvé avec le sélecteur "
                f"'{self.selectors['item']}' sur {self.url}"
            )
            return []

        # ==================== Extraction ====================
        jobs = []

        for item in items:
            job = self._parse_item(item)
            if job:
                jobs.append(job)

        return jobs

    def _parse_item(self, item) -> dict | None:
        """
        Parse un élément HTML en offre normalisée.
        """

        # Titre
        titre_el = item.select_one(self.selectors.get("titre", "h2"))
        if not titre_el:
            return None

        titre = titre_el.get_text(strip=True)
        if not titre:
            return None

        # URL
        url_el = item.select_one(self.selectors.get("url", "a"))
        if not url_el:
            return None

        href = url_el.get("href", "").strip()
        if not href:
            return None

        # Résout les URLs relatives
        if href.startswith("/") and self.base_url:
            href = urljoin(self.base_url, href)
        elif not href.startswith("http") and self.base_url:
            href = urljoin(self.base_url, href)

        # Description
        desc_el = item.select_one(self.selectors.get("description", "p"))
        description = desc_el.get_text(strip=True) if desc_el else None

        # Entreprise (optionnel)
        entreprise = None
        if self.selectors.get("entreprise"):
            ent_el = item.select_one(self.selectors["entreprise"])
            if ent_el:
                entreprise = ent_el.get_text(strip=True)

        return {
            "titre": titre,
            "entreprise": entreprise,
            "pays": self.country,
            "ville": None,
            "description": description,
            "type_contrat": None,
            "niveau": None,
            "categorie": None,
            "date_publication": None,
            "date_expiration": None,
            "url": href,
            "source": self.source_name,
            "teletravail": False,
        }
`,

  // ═══════════════════════════════════════════════════════════════
  // 5. backend/app/collectors/sources/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/collectors/sources/__init__.py": `
"""
Sources concrètes de collecte.

Chaque fichier contient une ou plusieurs classes de collecteurs
prêtes à être utilisées.

Exemple : sources/relay_rss.py
    - EmploiAfriqueRSS
    - SenegalEmploiRSS
    - RemoteOKRSS
    - WeWorkRemotelyRSS
"""
`,

  // ═══════════════════════════════════════════════════════════════
  // 6. backend/app/collectors/sources/relay_rss.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/collectors/sources/relay_rss.py": `
"""
Sources RSS réelles d'offres d'emploi.

⚠️ IMPORTANT : les URLs RSS doivent être vérifiées.
Certaines sources peuvent :
    - Ne plus exister
    - Changer d'URL
    - Blocquer les bots

Si une source échoue, elle sera simplement ignorée
(grâce à safe_collect).

Pour ajouter une nouvelle source :
    1. Créer une classe héritant de RSSCollector
    2. Passer l'URL du flux RSS et le nom de la source
    3. Ajouter la classe dans backend/app/api/collect.py
"""

from app.collectors.rss_collector import RSSCollector


# ==================== Sources africaines ====================
class EmploiAfriqueRSS(RSSCollector):
    """
    Emploi Afrique — plateforme panafricaine.

    Site : https://www.emploi-afrique.com
    """

    def __init__(self):
        super().__init__(
            feed_url="https://www.emploi-afrique.com/rss.xml",
            source_name="Emploi Afrique",
        )


class SenegalEmploiRSS(RSSCollector):
    """
    Sénégal Emploi — offres au Sénégal.

    Site : https://www.senegalemploi.com
    """

    def __init__(self):
        super().__init__(
            feed_url="https://www.senegalemploi.com/rss",
            source_name="Sénégal Emploi",
            country="Sénégal",
        )


# ==================== Sources internationales (télétravail) ====================
class RemoteOKRSS(RSSCollector):
    """
    RemoteOK — offres en télétravail (tech).

    Site : https://remoteok.com
    Utile pour les développeurs africains qui cherchent
    des missions remote.
    """

    def __init__(self):
        super().__init__(
            feed_url="https://remoteok.com/remote-dev-jobs.rss",
            source_name="RemoteOK",
        )


class WeWorkRemotelyRSS(RSSCollector):
    """
    WeWorkRemotely — offres remote programming.

    Site : https://weworkremotely.com
    """

    def __init__(self):
        super().__init__(
            feed_url=(
                "https://weworkremotely.com/categories/"
                "remote-programming-jobs.rss"
            ),
            source_name="WeWorkRemotely",
        )


# ==================== Registre des sources ====================
# Pour ajouter une source, il suffit de l'ajouter ici
ALL_SOURCES = [
    EmploiAfriqueRSS,
    SenegalEmploiRSS,
    RemoteOKRSS,
    WeWorkRemotelyRSS,
]
`,

  // ═══════════════════════════════════════════════════════════════
  // 7. backend/app/api/collect.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/api/collect.py": `
"""
Routes API pour la collecte manuelle.

Permet de déclencher la collecte depuis toutes les sources
enregistrées et d'insérer les offres en base.
"""

from fastapi import APIRouter

from app.core.logger import get_logger
from app.collectors.sources.relay_rss import ALL_SOURCES
from app.services.job_service import bulk_create_jobs


logger = get_logger(__name__)

router = APIRouter(tags=["collect"])


@router.post("/collect", summary="Lancer une collecte manuelle")
def collect_jobs():
    """
    Lance tous les collecteurs enregistrés et insère
    les offres récupérées en base.

    Retourne un résumé par source.
    """

    total_collected = 0
    total_inserted = 0
    total_skipped = 0

    details = []

    # ==================== Boucle sur les sources ====================
    for CollectorClass in ALL_SOURCES:
        collector = CollectorClass()
        jobs = collector.safe_collect()

        collected = len(jobs)

        if collected == 0:
            details.append({
                "source": collector.name,
                "collected": 0,
                "inserted": 0,
                "skipped": 0,
            })
            continue

        # ==================== Insertion en base ====================
        result = bulk_create_jobs(jobs)

        inserted = result.get("inserted", 0)
        skipped = result.get("skipped", 0)

        total_collected += collected
        total_inserted += inserted
        total_skipped += skipped

        details.append({
            "source": collector.name,
            "collected": collected,
            "inserted": inserted,
            "skipped": skipped,
        })

        logger.info(
            f"{collector.name} : "
            f"{collected} collectées, "
            f"{inserted} insérées, "
            f"{skipped} ignorées"
        )

    # ==================== Résumé global ====================
    logger.info(
        f"Collecte terminée : "
        f"{total_collected} collectées, "
        f"{total_inserted} insérées, "
        f"{total_skipped} ignorées"
    )

    return {
        "message": "Collecte terminée",
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "details": details,
    }


@router.get("/collect/sources", summary="Liste des sources de collecte")
def list_sources():
    """
    Retourne la liste des sources disponibles pour la collecte.
    """

    sources = []

    for CollectorClass in ALL_SOURCES:
        collector = CollectorClass()

        sources.append({
            "name": collector.name,
            "country": getattr(collector, "country", None),
            "type": "rss",
        })

    return sources
`,
};

// ==================== Fichier à modifier : main.py ====================
/**
 * Le fichier main.py doit être modifié pour inclure
 * le router collect. On utilise une stratégie de patch :
 * on lit le fichier, on vérifie si "collect" est déjà importé,
 * et on insère la ligne si nécessaire.
 */

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!exists(mainPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  // Vérifie si déjà patché
  if (content.includes("from app.api import jobs, stats, collect")) {
    log.info("main.py déjà patché (collect importé)");
    return true;
  }

  if (content.includes("collect.router")) {
    log.info("main.py déjà patché (collect.router inclus)");
    return true;
  }

  // Backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(ROOT, "_backups", timestamp);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(
    fullPath,
    path.join(backupDir, "backend", "app", "main.py")
  );

  // Patch 1 : ajouter collect à l'import
  if (content.includes("from app.api import jobs, stats")) {
    content = content.replace(
      "from app.api import jobs, stats",
      "from app.api import jobs, stats, collect"
    );
  } else if (content.includes("from app.api import jobs")) {
    content = content.replace(
      "from app.api import jobs",
      "from app.api import jobs, collect"
    );
  }

  // Patch 2 : ajouter app.include_router(collect.router)
  if (!content.includes("app.include_router(collect.router)")) {
    // Cherche la première occurrence de app.include_router(stats.router)
    if (content.includes("app.include_router(stats.router)")) {
      content = content.replace(
        "app.include_router(stats.router)",
        "app.include_router(stats.router)\napp.include_router(collect.router)"
      );
    } else if (content.includes("app.include_router(jobs.router)")) {
      content = content.replace(
        "app.include_router(jobs.router)",
        "app.include_router(jobs.router)\napp.include_router(collect.router)"
      );
    }
  }

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(mainPath + " (patché)", "overwritten");
  return true;
}

// ==================== Résumé ====================
function showSummary(stats) {
  log.banner("✅ MODULE 02 — TERMINÉ");

  console.log("");
  console.log("  📄 Fichiers créés    :", stats.created);
  console.log("  📄 Fichiers écrasés  :", stats.overwritten);
  console.log("  📄 Fichiers ignorés  :", stats.skipped);
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN : aucun fichier n'a été réellement écrit.");
    console.log("");
  }

  console.log("  Prochaines étapes :");
  console.log("  ───────────────────────────────────────");
  console.log("");
  console.log("  1. Uvicorn détecte les changements automatiquement");
  console.log("     (grâce au --reload)");
  console.log("");
  console.log("  2. Ouvrir Swagger UI :");
  console.log("     http://127.0.0.1:8000/docs");
  console.log("");
  console.log("  3. Tester la collecte :");
  console.log("     → Chercher POST /collect");
  console.log("     → Cliquer sur 'Try it out'");
  console.log("     → Cliquer sur 'Execute'");
  console.log("");
  console.log("  4. Vérifier les offres collectées :");
  console.log("     → GET /jobs");
  console.log("     → GET /stats");
  console.log("");
  console.log("  5. Voir les sources disponibles :");
  console.log("     → GET /collect/sources");
  console.log("");

  if (OPTIONS.verbose) {
    console.log("  📋 Fichiers créés :");
    console.log("");
    for (const file of Object.keys(FILES)) {
      console.log("    " + file);
    }
    console.log("");
  }
}

// ==================== Étape 1 : Désinstallation ====================
function stepUninstall() {
  log.section("🗑️  Désinstallation du module 02");

  let removed = 0;

  // Supprime les fichiers créés
  for (const file of Object.keys(FILES)) {
    if (!exists(file)) continue;

    if (!OPTIONS.dryRun) {
      removeFile(file);
    }
    log.file(file, "removed");
    removed++;
  }

  // Tente de retirer l'import collect de main.py
  const mainPath = "backend/app/main.py";
  if (exists(mainPath)) {
    const fullPath = path.join(ROOT, mainPath);
    let content = fs.readFileSync(fullPath, "utf8");

    content = content
      .replace("from app.api import jobs, stats, collect", "from app.api import jobs, stats")
      .replace("from app.api import jobs, collect", "from app.api import jobs")
      .replace("app.include_router(collect.router)\n", "")
      .replace("\napp.include_router(collect.router)", "");

    if (!OPTIONS.dryRun) {
      fs.writeFileSync(fullPath, content, "utf8");
    }
    log.file(mainPath + " (nettoyé)", "overwritten");
  }

  if (!OPTIONS.dryRun) {
    markUninstalled(MODULE_ID);
  }

  log.banner("🗑️  Module 02 désinstallé");
  console.log("");
  console.log("  Fichiers supprimés :", removed);
  console.log("");
}

// ==================== Étape 2 : Création des fichiers ====================
function stepCreateFiles() {
  log.section(`📄 Création de ${Object.keys(FILES).length} fichiers`);

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
    `→ ${results.created} créé(s), ${results.overwritten} écrasé(s), ${results.skipped} ignoré(s)`
  );

  return results;
}

// ==================== Étape 3 : Patch de main.py ====================
function stepPatchMain() {
  log.section("🔧 Patch de main.py");

  if (OPTIONS.dryRun) {
    log.info("Mode dry-run : main.py ne sera pas modifié");
    return;
  }

  const success = patchMainPy();

  if (success) {
    log.info("main.py patché avec succès");
  } else {
    log.warn(
      "⚠️  Patch de main.py échoué. Ajoutez manuellement :\\n" +
      "     from app.api import jobs, stats, collect\\n" +
      "     app.include_router(collect.router)"
    );
  }
}

// ==================== Étape 4 : Enregistrement ====================
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

  log.info("État enregistré dans _state/installed.json");
}

// ==================== Main ====================
async function main() {
  log.banner("🚀 MODULE 02 — COLLECTEURS");
  console.log("");
  console.log("  RSS + HTML + 4 sources africaines et internationales");
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN activé : aucune modification réelle");
    console.log("");
  }

  // ==================== Vérification des prérequis ====================
  if (!OPTIONS.uninstall) {
    if (!validateRequirements(REQUIREMENTS, MODULE_NAME)) {
      console.log("");
      log.info("Astuce : installez d'abord les modules 00 et 01 :");
      console.log("    node 00-architecture.js");
      console.log("    node 01-backend-base.js");
      console.log("");
      process.exit(1);
    }

    if (isInstalled(MODULE_ID) && !OPTIONS.force) {
      log.warn("Le module 02 est déjà installé.");
      log.info("Utilisez --force pour réinstaller, ou --uninstall pour supprimer.");
      console.log("");
      process.exit(0);
    }
  }

  // ==================== Désinstallation ====================
  if (OPTIONS.uninstall) {
    stepUninstall();
    return;
  }

  // ==================== Création ====================
  const results = stepCreateFiles();
  stepPatchMain();
  stepRegister(results);

  // ==================== Résumé ====================
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
