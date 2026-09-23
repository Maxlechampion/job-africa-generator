#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 01-fix — STABILISATION DU PROJET
 * ═══════════════════════════════════════════════════════════════
 *
 * Corrige les problèmes de cohérence détectés :
 *
 *   1. Corrige backend/app/main.py (structure cassée)
 *      - Supprime les @app.on_event orphelins
 *      - Utilise lifespan (moderne) au lieu de @app.on_event
 *      - Corrige les doubles déclarations startup/shutdown
 *
 *   2. Crée MODULES.md (documentation de la numérotation)
 *
 *   3. Met à jour _state/installed.json (module 02 manquant)
 *
 *   4. Nettoie les doublons (backup en .bak, pas de suppression)
 *
 * USAGE :
 *   node 01-fix-main.js [options]
 *
 * OPTIONS :
 *   --dry-run     Simule sans écrire
 *   --verbose     Affiche plus de détails
 *   --skip-backup Ne fait pas de backup (déconseillé)
 *
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { exists, ROOT } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const OPTIONS = {
  dryRun: args.includes("--dry-run"),
  verbose: args.includes("--verbose"),
  skipBackup: args.includes("--skip-backup"),
};

// ==================== Contenu de main.py corrigé ====================

const MAIN_PY_CORRIGE = `"""
Point d'entree de l'application Job Africa API.

FastAPI avec CORS, healthcheck, scheduler et routers.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.middleware import LanguageMiddleware
from app.core.config import settings
from app.core.logger import get_logger
from app.services.scheduler import start_scheduler, stop_scheduler
from app.api import (
    jobs,
    stats,
    collect,
    admin,
    collect_ats,
    collect_scrapers,
    collect_api,
    admin_dedup,
    companies,
    skills,
    favorites,
    alerts,
    admin_sources,
    ai,
    dashboard,
    auth,
)


logger = get_logger(__name__)


# ==================== Lifespan (démarrage / arrêt) ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère le cycle de vie de l'application.

    - Au démarrage : initialise le scheduler
    - À l'arrêt : arrête le scheduler proprement
    """

    # ==================== Démarrage ====================
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("API démarrée avec succès")

    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Erreur démarrage scheduler : {e}")

    yield

    # ==================== Arrêt ====================
    try:
        stop_scheduler()
    except Exception as e:
        logger.error(f"Erreur arrêt scheduler : {e}")

    logger.info("API arrêtée")


# ==================== Application ====================
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API de collecte et de diffusion "
        "d'offres d'emploi en Afrique de l'Ouest"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ==================== Middleware ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LanguageMiddleware)


# ==================== Routers ====================
app.include_router(jobs.router)
app.include_router(stats.router)
app.include_router(collect.router)
app.include_router(admin.router)
app.include_router(collect_ats.router)
app.include_router(collect_scrapers.router)
app.include_router(collect_api.router)
app.include_router(admin_dedup.router)
app.include_router(companies.router)
app.include_router(skills.router)
app.include_router(favorites.router)
app.include_router(alerts.router)
app.include_router(admin_sources.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(auth.router)


# ==================== Root ====================
@app.get("/", tags=["root"], summary="Accueil")
def home():
    """Point d'entree de l'API."""

    return {
        "message": "Bienvenue sur Job Africa API",
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["root"], summary="Healthcheck")
def health():
    """Verification de l'etat de l'API."""

    return {"status": "ok"}
`;

// ==================== Contenu de MODULES.md ====================

const MODULES_MD = `# 📋 Job Africa — Documentation des modules

Ce document décrit la **numérotation finale** des modules du projet
et clarifie les doublons détectés.

---

## 🎯 Modules installés (confirmés)

État réel basé sur \`_state/installed.json\` :

| # | Module | Fichier JS | Date | Statut |
|---|---|---|---|---|
| 00 | Architecture | \`00-architecture.js\` | 17/09 | ✅ |
| 01 | Backend Base | \`01-backend-base.js\` | 17/09 | ✅ |
| 02 | Collecteurs RSS | \`02-collectors.js\` | 17/09 | ✅ |
| 03 | Scheduler | \`03-scheduler.js\` | 17/09 | ✅ |
| 03.5 | ATS Collector | \`04-ats-collector.js\` | 17/09 | ✅ |
| 04 | Scraper HTML | \`04-scraper-html.js\` | 17/09 | ✅ |
| 05 | API Collector | \`05-api-collector.js\` | 18/09 | ✅ |
| 06 | Déduplication | \`06-deduplication.js\` | 18/09 | ✅ |
| 07 | Base enrichie | \`07-database-enriched.js\` | 18/09 | ✅ |
| 08 | IA Hugging Face | \`08-ai-huggingface.js\` | 18/09 | ✅ |
| 09 | Frontend Vue | \`09-frontend-vue.js\` | 22/09 | ✅ |
| 10 | Dashboard Admin | \`10-admin-dashboard.js\` | 22/09 | ✅ |
| 11 | Auth Supabase | \`11-auth-supabase.js\` | 22/09 | ✅ |
| 12 | Multi-langue | \`12-i18n.js\` | 22/09 | ✅ |

**Total : 14 modules installés**

---

## ❌ Modules restants à installer

| # | Module | Fichier JS | Priorité |
|---|---|---|---|
| 13 | Partage social | \`13-social-share.js\` | 🔴 Haute |
| 14 | Monétisation | \`14-monetization.js\` | 🔴 Haute |
| 15 | Notifications push | \`15-push-notifications.js\` | 🔴 Haute |
| 09b | CI/CD | \`09-cicd-deployment.js\` | 🟡 Moyenne |
| 10b | PWA | \`10-pwa.js\` | 🟡 Moyenne |

---

## ⚠️ Fichiers JS en double (à nettoyer)

Ces fichiers existent mais **ne sont pas utilisés** par la version installée :

| Fichier | Statut | Remplacé par |
|---|---|---|
| \`04-deduplication.js\` | 🗑️ Obsolète | \`06-deduplication.js\` |
| \`04-ats-collector.js\` | ✅ Utilisé | — |
| \`05-ai-huggingface.js\` | 🗑️ Obsolète | \`08-ai-huggingface.js\` |
| \`06-database-enriched.js\` | 🗑️ Obsolète | \`07-database-enriched.js\` |
| \`07-frontend-vue.js\` | 🗑️ Obsolète | \`09-frontend-vue.js\` |
| \`08-admin-dashboard.js\` | 🗑️ Obsolète | \`10-admin-dashboard.js\` |
| \`09-cicd-deployment.js\` | 📌 À venir | — |
| \`10-pwa.js\` | 📌 À venir | — |

**Recommandation** : renommer les fichiers obsolètes en \`.bak\` (pas de suppression).

---

## 🗄️ Tables Supabase (13 tables)

D'après \`information_schema.tables\` :

| Table | Rôle | Module |
|---|---|---|
| \`jobs\` | Offres d'emploi | 01 |
| \`collect_logs\` | Journal des collectes | 03 |
| \`companies\` | Entreprises | 07 |
| \`skills\` | Compétences | 07 |
| \`job_skills\` | Relation offre ↔ compétence | 07 |
| \`sources\` | Sources de collecte | 07 |
| \`favorites\` | Favoris utilisateur | 07 |
| \`alerts\` | Alertes email/push | 07 |
| \`alert_notifications\` | Historique notifications | 07 |
| \`users\` | Profils utilisateurs | 11 |
| \`user_roles\` | Rôles (user/admin) | 11 |
| \`v_stats_pays\` | Vue statistiques pays | 07 |
| \`v_top_skills\` | Vue top compétences | 07 |

---

## 🔌 Routers Backend (16 routers)

| Router | Fichier | Module |
|---|---|---|
| \`jobs\` | \`api/jobs.py\` | 01 |
| \`stats\` | \`api/stats.py\` | 01 |
| \`collect\` | \`api/collect.py\` | 02 |
| \`admin\` | \`api/admin.py\` | 03 |
| \`collect_ats\` | \`api/collect_ats.py\` | 03.5 |
| \`collect_scrapers\` | \`api/collect_scrapers.py\` | 04 |
| \`collect_api\` | \`api/collect_api.py\` | 05 |
| \`admin_dedup\` | \`api/admin_dedup.py\` | 06 |
| \`companies\` | \`api/companies.py\` | 07 |
| \`skills\` | \`api/skills.py\` | 07 |
| \`favorites\` | \`api/favorites.py\` | 07 |
| \`alerts\` | \`api/alerts.py\` | 07 |
| \`admin_sources\` | \`api/admin_sources.py\` | 07 |
| \`ai\` | \`api/ai.py\` | 08 |
| \`dashboard\` | \`api/dashboard.py\` | 10 |
| \`auth\` | \`api/auth.py\` | 11 |

---

## 🎨 Routes Frontend (10 routes)

| Route | Vue | Module |
|---|---|---|
| \`/:lang?/\` | HomeView | 09 |
| \`/:lang?/jobs\` | JobsView | 09 |
| \`/:lang?/jobs/:id\` | JobDetailView | 09 |
| \`/:lang?/stats\` | StatsView | 09 |
| \`/:lang?/login\` | LoginView | 11 |
| \`/:lang?/signup\` | SignupView | 11 |
| \`/:lang?/reset-password\` | ResetPasswordView | 11 |
| \`/:lang?/account\` | AccountView | 11 |
| \`/:lang?/admin\` | AdminView | 10 |
| \`/:lang?/*\` | NotFoundView | 09 |

**Note** : \`/:lang?\` = préfixe optionnel \`fr\` ou \`en\` (module 12).

---

## 🚀 Prochaines étapes

1. ✅ **Stabilisation** (ce module)
2. ⏳ **Module 13** — Partage social
3. ⏳ **Module 15** — Notifications push
4. ⏳ **Module 14** — Monétisation
5. ⏳ **Module 09b** — CI/CD
6. ⏳ **Module 10b** — PWA

---

## 📅 Historique

| Date | Action |
|---|---|
| 17/09 | Installation modules 00 → 04 |
| 18/09 | Installation modules 05 → 08 |
| 22/09 | Installation modules 09 → 12 |
| 23/09 | Stabilisation (fix main.py + docs) |
`;

// ==================== Backups ====================

function backupFile(relativePath) {
  if (OPTIONS.skipBackup) {
    return null;
  }

  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(ROOT, "_backups", timestamp);
  const backupPath = path.join(backupDir, relativePath);

  if (!OPTIONS.dryRun) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(fullPath, backupPath);
  }

  return backupPath;
}

function renameToBak(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }

  const bakPath = fullPath + ".bak";

  if (OPTIONS.dryRun) {
    log.file(relativePath + " → .bak (dry-run)", "skipped");
    return true;
  }

  // Si .bak existe déjà, on écrase
  if (fs.existsSync(bakPath)) {
    fs.unlinkSync(bakPath);
  }

  fs.renameSync(fullPath, bakPath);
  log.file(relativePath + " → .bak", "overwritten");
  return true;
}

// ==================== Étapes ====================

function step1_fixMainPy() {
  log.section("1. Correction de main.py");

  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  // Backup
  const backup = backupFile(mainPath);
  if (backup) {
    log.info(`Backup : _backups/${path.basename(path.dirname(backup))}/backend/app/main.py`);
  }

  // Écriture
  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, MAIN_PY_CORRIGE, "utf8");
    log.file(mainPath, "overwritten");
  } else {
    log.file(mainPath, "skipped");
  }

  log.info("main.py corrigé (lifespan + routers propres)");
  return true;
}

function step2_createModulesMd() {
  log.section("2. Création de MODULES.md");

  const mdPath = "MODULES.md";
  const fullPath = path.join(ROOT, mdPath);

  // Backup si existe
  if (fs.existsSync(fullPath)) {
    backupFile(mdPath);
  }

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, MODULES_MD, "utf8");
    log.file(mdPath, "created");
  } else {
    log.file(mdPath, "skipped");
  }

  log.info("Documentation créée");
  return true;
}

function step3_fixInstalledJson() {
  log.section("3. Mise à jour de installed.json");

  const statePath = "_state/installed.json";
  const fullPath = path.join(ROOT, statePath);

  if (!fs.existsSync(fullPath)) {
    log.warn("installed.json introuvable, création d'un nouveau");
  }

  let state = { modules: {} };

  try {
    if (fs.existsSync(fullPath)) {
      state = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    }
  } catch (e) {
    log.warn(`Erreur lecture installed.json : ${e.message}`);
  }

  // Ajoute le module 02 s'il manque
  if (!state.modules["02"]) {
    state.modules["02"] = {
      installedAt: "2026-09-17T17:00:00.000Z",
      version: "1.0.0",
      note: "Ajouté manuellement (module 02 manquant)",
      files: [
        "backend/app/collectors/__init__.py",
        "backend/app/collectors/base.py",
        "backend/app/collectors/rss_collector.py",
        "backend/app/collectors/scraper.py",
        "backend/app/collectors/sources/__init__.py",
        "backend/app/collectors/sources/relay_rss.py",
        "backend/app/api/collect.py",
      ],
    };
    log.info("Module 02 ajouté à installed.json");
  }

  // Backup
  backupFile(statePath);

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, JSON.stringify(state, null, 2), "utf8");
    log.file(statePath, "overwritten");
  }

  return true;
}

function step4_cleanupDuplicates() {
  log.section("4. Nettoyage des doublons");

  const duplicates = [
    "04-deduplication.js",
    "05-ai-huggingface.js",
    "06-database-enriched.js",
    "07-frontend-vue.js",
    "08-admin-dashboard.js",
  ];

  let renamed = 0;

  for (const file of duplicates) {
    if (exists(file)) {
      const success = renameToBak(file);
      if (success) renamed++;
    } else if (OPTIONS.verbose) {
      log.info(`${file} n'existe pas (ignoré)`);
    }
  }

  log.info(`${renamed} fichier(s) renommé(s) en .bak`);
  return true;
}

function step5_showSummary() {
  log.banner("✅ STABILISATION TERMINÉE");

  console.log("");
  console.log("  Modifications apportées :");
  console.log("");
  console.log("  ✅ backend/app/main.py  → corrigé (lifespan)");
  console.log("  ✅ MODULES.md           → créé");
  console.log("  ✅ _state/installed.json → mis à jour (module 02)");
  console.log("  ✅ Doublons             → renommés en .bak");
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN : aucun fichier n'a été réellement modifié.");
    console.log("");
  }

  console.log("  Prochaines étapes :");
  console.log("  ───────────────────────────────────────");
  console.log("");
  console.log("  1. Redémarrer Uvicorn :");
  console.log("     cd backend");
  console.log("     uvicorn app.main:app --reload --reload-dir app");
  console.log("");
  console.log("  2. Vérifier le démarrage :");
  console.log("     - Le scheduler doit démarrer");
  console.log("     - Aucune erreur de syntaxe");
  console.log("");
  console.log("  3. Installer les modules restants :");
  console.log("     node 13-social-share.js");
  console.log("     node 15-push-notifications.js");
  console.log("     node 14-monetization.js");
  console.log("     node 09-cicd-deployment.js");
  console.log("     node 10-pwa.js");
  console.log("");
}

// ==================== Main ====================

async function main() {
  log.banner("🔧 MODULE 01-fix — STABILISATION");

  console.log("");
  console.log("  Corrections :");
  console.log("  • main.py (structure cassée)");
  console.log("  • MODULES.md (documentation)");
  console.log("  • installed.json (module 02 manquant)");
  console.log("  • Doublons (renommage .bak)");
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN activé : aucune modification réelle");
    console.log("");
  }

  try {
    step1_fixMainPy();
    step2_createModulesMd();
    step3_fixInstalledJson();
    step4_cleanupDuplicates();
    step5_showSummary();
  } catch (e) {
    log.error(`Erreur : ${e.message}`);
    if (OPTIONS.verbose) console.error(e.stack);
    process.exit(1);
  }
}

main();