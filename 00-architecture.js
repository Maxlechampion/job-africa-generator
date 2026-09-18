#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 00 — ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════
 *
 * Crée l'arborescence complète du projet Job Africa ainsi que
 * les fichiers de base (README, .gitignore, .editorconfig).
 *
 * Ce module est OBLIGATOIRE avant tous les autres.
 *
 * USAGE :
 *   node 00-architecture.js [options]
 *
 * OPTIONS :
 *   --force       Écrase les fichiers existants (backup auto)
 *   --dry-run     Simule sans écrire sur le disque
 *   --uninstall   Supprime toute l'arborescence créée
 *   --verbose     Affiche plus de détails
 *
 * EXEMPLES :
 *   node 00-architecture.js
 *   node 00-architecture.js --dry-run
 *   node 00-architecture.js --force
 *   node 00-architecture.js --uninstall
 *
 * PRÉREQUIS :
 *   Aucun (c'est le premier module)
 *
 * DÉPENDANCES :
 *   - chalk (couleurs terminal)
 *   - _lib/fs-utils.js
 *   - _lib/logger.js
 *   - _lib/registry.js
 *
 * FICHIERS CRÉÉS :
 *   Dossiers (30+) :
 *     backend/app/{core,schemas,services,collectors,collectors/sources,api}
 *     backend/{scripts,tests}
 *     frontend/public/icons
 *     frontend/src/{assets,router,stores,services,i18n,i18n/locales}
 *     frontend/src/components/{layout,ui,jobs,admin,pwa,monetization}
 *     frontend/src/views
 *     frontend/src/utils
 *     supabase
 *     .github/workflows
 *     _lib, _config, _state
 *
 *   Fichiers de base (7) :
 *     backend/README.md
 *     frontend/README.md
 *     supabase/README.md
 *     .gitignore
 *     .editorconfig
 *     _config/project.json
 *     _state/.gitkeep
 *
 * ÉTAT ENREGISTRÉ :
 *   _state/installed.json → {modules: {"00": {...}}}
 *
 * ROLLBACK :
 *   node 00-architecture.js --uninstall
 *   (supprime tous les dossiers vides, conserve les fichiers de
 *   modules installés)
 *
 * ═══════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { ensureDir, exists, removeDir, writeFile } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";
import {
  markInstalled,
  markUninstalled,
  isInstalled,
} from "./_lib/registry.js";

// ==================== Résolution du chemin racine ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== Parse des arguments CLI ====================
const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  uninstall: args.includes("--uninstall"),
  verbose: args.includes("--verbose"),
};

// ==================== Constantes du module ====================
const MODULE_ID = "00";
const MODULE_NAME = "Architecture";
const MODULE_VERSION = "1.0.0";

// ==================== Arborescence à créer ====================
const DIRECTORIES = [
  // ---------- BACKEND ----------
  "backend",
  "backend/app",
  "backend/app/core",
  "backend/app/schemas",
  "backend/app/services",
  "backend/app/collectors",
  "backend/app/collectors/sources",
  "backend/app/api",
  "backend/scripts",
  "backend/tests",

  // ---------- FRONTEND ----------
  "frontend",
  "frontend/public",
  "frontend/public/icons",
  "frontend/src",
  "frontend/src/assets",
  "frontend/src/router",
  "frontend/src/stores",
  "frontend/src/services",
  "frontend/src/i18n",
  "frontend/src/i18n/locales",
  "frontend/src/components",
  "frontend/src/components/layout",
  "frontend/src/components/ui",
  "frontend/src/components/jobs",
  "frontend/src/components/admin",
  "frontend/src/components/pwa",
  "frontend/src/components/monetization",
  "frontend/src/views",
  "frontend/src/utils",

  // ---------- SUPABASE ----------
  "supabase",

  // ---------- CI/CD ----------
  ".github",
  ".github/workflows",

  // ---------- GÉNÉRATEUR ----------
  "_lib",
  "_config",
  "_state",
  "_backups",
];

// ==================== Fichiers de base à créer ====================
const BASE_FILES = {
  // ---------- BACKEND README ----------
  "backend/README.md": `# Job Africa — Backend

Backend FastAPI de l'agrégateur intelligent d'offres d'emploi en Afrique de l'Ouest.

## Stack technique

- Python 3.12
- FastAPI 0.115
- Supabase (PostgreSQL managé)
- APScheduler (tâches planifiées)
- Hugging Face (IA gratuite)
- Resend (emails transactionnels)

## Prérequis

- Python 3.11 ou supérieur
- Compte Supabase (gratuit)
- Compte Resend (gratuit)

## Installation

\`\`\`bash
# Créer l'environnement virtuel
python -m venv venv

# Activer (Windows)
venv\\Scripts\\activate

# Activer (Linux/Mac)
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
\`\`\`

## Configuration

Copier \`.env.example\` vers \`.env\` et remplir les variables.

\`\`\`bash
cp .env.example .env
\`\`\`

## Lancer le serveur

\`\`\`bash
uvicorn app.main:app --reload
\`\`\`

- API : http://127.0.0.1:8000
- Documentation : http://127.0.0.1:8000/docs

## Tests

\`\`\`bash
pytest -v
\`\`\`

## Structure

\`\`\`
app/
├── main.py              Point d'entrée FastAPI
├── core/                Config, logger, supabase, auth
├── schemas/             Modèles Pydantic
├── services/            Logique métier
├── collectors/          Collecteurs de sources
├── api/                 Routes FastAPI
└── ...
\`\`\`
`,

  // ---------- FRONTEND README ----------
  "frontend/README.md": `# Job Africa — Frontend

Interface web Vue.js 3 de l'agrégateur Job Africa.

## Stack technique

- Vue 3 (Composition API)
- Vite (build ultra-rapide)
- Pinia (state management)
- Vue Router (navigation)
- TailwindCSS (styling)
- Axios (HTTP)

## Prérequis

- Node.js 20 ou supérieur
- npm 10 ou supérieur

## Installation

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

Le site est disponible sur http://localhost:5173

## Build production

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Variables d'environnement

Créer un fichier \`.env\` :

\`\`\`env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
\`\`\`

## Structure

\`\`\`
src/
├── main.js              Point d'entrée
├── App.vue              Composant racine
├── router/              Configuration des routes
├── stores/              Stores Pinia
├── services/            Appels API
├── i18n/                Traductions FR/EN
├── components/          Composants réutilisables
└── views/               Pages
\`\`\`
`,

  // ---------- SUPABASE README ----------
  "supabase/README.md": `# Job Africa — Supabase

Schémas SQL, index et migrations pour Supabase.

## Ordre d'exécution

Exécuter les fichiers SQL **dans l'ordre numérique** dans le SQL Editor de Supabase :

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | \`01_schema.sql\` | Tables principales |
| 2 | \`02_indexes.sql\` | Index de performance |
| 3 | \`03_views.sql\` | Vues statistiques |
| 4 | \`04_rls.sql\` | Row Level Security |
| 5 | \`05_seed.sql\` | Données initiales |
| 6 | \`06_auth.sql\` | Rôles + hook JWT |
| 7 | \`07_shares.sql\` | Tracking des partages |
| 8 | \`08_monetization.sql\` | Transactions + sponsoring |
| 9 | \`09_push.sql\` | Souscriptions push |

## Comment exécuter

1. Ouvrir https://supabase.com/dashboard
2. Sélectionner ton projet
3. Aller dans **SQL Editor**
4. Copier le contenu d'un fichier
5. Coller et cliquer **Run**
6. Répéter pour chaque fichier dans l'ordre

## Vérification

\`\`\`sql
-- Lister toutes les tables
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
\`\`\`
`,

  // ---------- .GITIGNORE ----------
  ".gitignore": `# ==================== Python ====================
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Environnements virtuels
venv/
.venv/
ENV/
env/

# Tests
.pytest_cache/
.coverage
.coverage.*
htmlcov/
.tox/
.nox/
junit/
coverage.xml
*.cover

# ==================== Node ====================
node_modules/
dist/
dist-ssr/
.vite/
*.local
.npm
.eslintcache
.pnpm-debug.log*
yarn-debug.log*
yarn-error.log*

# ==================== Environnement ====================
.env
.env.local
.env.*.local
!.env.example
!.env.production.example

# ==================== IDE ====================
.vscode/*
!.vscode/extensions.json
.idea/
*.swp
*.swo
*.sublime-workspace

# ==================== OS ====================
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# ==================== Générateur Job Africa ====================
_backups/
_state/*.json
!_state/.gitkeep

# ==================== IA (Hugging Face) ====================
backend/.hf_cache/
*.safetensors
*.bin

# ==================== Logs ====================
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# ==================== Secrets ====================
*.pem
*.key
secrets/
`,

  // ---------- .EDITORCONFIG ----------
  ".editorconfig": `# Configuration EditorConfig pour Job Africa
# https://editorconfig.org

root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.py]
indent_size = 4
max_line_length = 100

[*.{js,ts,vue,jsx,tsx,json}]
indent_size = 2

[*.{yml,yaml}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.sql]
indent_size = 2

[Makefile]
indent_style = tab
`,

  // ---------- _CONFIG/PROJECT.JSON ----------
  "_config/project.json": `{
  "project": {
    "name": "Job Africa",
    "slug": "job-africa",
    "description": "Agrégateur intelligent d'offres d'emploi en Afrique de l'Ouest",
    "version": "1.0.0",
    "author": "À compléter",
    "email": "contact@jobafrica.app",
    "license": "MIT"
  },

  "paths": {
    "backend": "backend",
    "frontend": "frontend",
    "supabase": "supabase",
    "github": ".github/workflows",
    "scripts": "backend/scripts",
    "tests": "backend/tests"
  },

  "urls": {
    "frontend_dev": "http://localhost:5173",
    "backend_dev": "http://127.0.0.1:8000",
    "frontend_prod": "https://job-africa.vercel.app",
    "backend_prod": "https://job-africa-api.onrender.com"
  },

  "features": {
    "ai": true,
    "i18n": true,
    "monetization": true,
    "push": true,
    "pwa": true,
    "social_share": true,
    "admin": true,
    "auth": true
  },

  "languages": ["fr", "en"],
  "default_language": "fr",

  "ai_models": {
    "summarizer": "Labagaite/gemma-Summarizer-2b-it-LORA-bnb-4bit",
    "ner": "VAGOsolutions/SauerkrautLM-LFM2.5-GLiNER",
    "language_id": "UBC-NLP/afroscope-model",
    "embeddings": "ibm-granite/granite-embedding-97m-multilingual-r2"
  },

  "payment": {
    "provider": "kkiapay",
    "currency": "XOF",
    "prices": {
      "premium_job": 2000,
      "premium_subscription": 5000,
      "sponsored_job": 25000,
      "banner_week": 50000
    }
  },

  "email": {
    "provider": "resend",
    "from": "Job Africa <noreply@jobafrica.app>"
  },

  "deployment": {
    "backend": "render",
    "frontend": "vercel",
    "database": "supabase"
  }
}
`,

  // ---------- _STATE/.GITKEEP ----------
  "_state/.gitkeep": ``,
};

// ==================== Fonction de résumé ====================
function showSummary(stats) {
  log.banner("✅ MODULE 00 — TERMINÉ");

  console.log("");
  console.log("  📁 Dossiers créés    :", stats.dirs);
  console.log("  📄 Fichiers créés    :", stats.filesCreated);
  console.log("  📄 Fichiers écrasés  :", stats.filesOverwritten);
  console.log("  📄 Fichiers ignorés  :", stats.filesSkipped);
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN : aucun fichier n'a été réellement écrit.");
    console.log("");
  }

  console.log("  Prochaines étapes :");
  console.log("  ─────────────────");
  console.log("  node 01-backend-base.js");
  console.log("");

  if (OPTIONS.verbose) {
    console.log("  📋 Détail complet :");
    console.log("");
    console.log("  Dossiers :");
    for (const dir of DIRECTORIES) {
      console.log("    " + dir + "/");
    }
    console.log("");
    console.log("  Fichiers de base :");
    for (const file of Object.keys(BASE_FILES)) {
      console.log("    " + file);
    }
    console.log("");
  }
}

// ==================== Étape 1 : Désinstallation ====================
function stepUninstall() {
  log.section("🗑️  Désinstallation de l'architecture");

  let removed = 0;

  // On parcourt en ordre inverse pour supprimer les sous-dossiers d'abord
  const reversed = [...DIRECTORIES].reverse();

  for (const dir of reversed) {
    if (!exists(dir)) {
      continue;
    }

    // Vérifie si le dossier est vide (ne supprime que les vides)
    const fullPath = path.join(__dirname, dir);

    try {
      const entries = fs.readdirSync(fullPath);

      if (entries.length === 0) {
        if (!OPTIONS.dryRun) {
          removeDir(dir);
        }
        log.file(dir + "/", "removed");
        removed++;
      } else if (OPTIONS.verbose) {
        log.warn(`Dossier non vide conservé : ${dir} (${entries.length} éléments)`);
      }
    } catch (e) {
      log.warn(`Impossible de supprimer ${dir} : ${e.message}`);
    }
  }

  // Supprime les fichiers de base si présents
  for (const file of Object.keys(BASE_FILES)) {
    if (!exists(file)) continue;

    if (!OPTIONS.dryRun) {
      try {
        fs.unlinkSync(path.join(__dirname, file));
      } catch (e) {
        log.warn(`Impossible de supprimer ${file} : ${e.message}`);
      }
    }
    log.file(file, "removed");
    removed++;
  }

  if (!OPTIONS.dryRun) {
    markUninstalled(MODULE_ID);
  }

  log.banner("🗑️  Architecture désinstallée");
  console.log("");
  console.log("  Éléments supprimés :", removed);
  console.log("");
}

// ==================== Étape 2 : Création des dossiers ====================
function stepCreateDirectories() {
  log.section("📁 Création des dossiers");

  let created = 0;
  let existed = 0;

  for (const dir of DIRECTORIES) {
    const alreadyExists = exists(dir);

    if (alreadyExists) {
      existed++;
      if (OPTIONS.verbose) {
        log.file(dir + "/", "skipped");
      }
      continue;
    }

    if (!OPTIONS.dryRun) {
      ensureDir(dir);
    }

    log.file(dir + "/", "created");
    created++;
  }

  log.info(`→ ${created} dossier(s) créé(s), ${existed} déjà existant(s)`);

  return { created, existed };
}

// ==================== Étape 3 : Création des fichiers de base ====================
function stepCreateBaseFiles() {
  log.section("📄 Création des fichiers de base");

  let filesCreated = 0;
  let filesOverwritten = 0;
  let filesSkipped = 0;

  for (const [relativePath, content] of Object.entries(BASE_FILES)) {
    const alreadyExists = exists(relativePath);

    // Si existe et pas --force → skip
    if (alreadyExists && !OPTIONS.force) {
      filesSkipped++;
      if (OPTIONS.verbose) {
        log.file(relativePath, "skipped");
      }
      continue;
    }

    const result = writeFile(relativePath, content, {
      overwrite: OPTIONS.force,
      backup: true,
      dryRun: OPTIONS.dryRun,
    });

    if (result.status === "created") {
      log.file(relativePath, "created");
      filesCreated++;
    } else if (result.status === "overwritten") {
      log.file(relativePath, "overwritten");
      filesOverwritten++;
    } else if (result.status === "skipped") {
      filesSkipped++;
    }
  }

  log.info(
    `→ ${filesCreated} créé(s), ${filesOverwritten} écrasé(s), ${filesSkipped} ignoré(s)`
  );

  return { filesCreated, filesOverwritten, filesSkipped };
}

// ==================== Étape 4 : Enregistrement ====================
function stepRegister(dirStats, fileStats) {
  if (OPTIONS.dryRun) return;

  markInstalled(MODULE_ID, {
    version: MODULE_VERSION,
    installedAt: new Date().toISOString(),
    directories: DIRECTORIES.length,
    directoriesCreated: dirStats.created,
    directoriesExisted: dirStats.existed,
    files: Object.keys(BASE_FILES),
    filesCreated: fileStats.filesCreated,
    filesOverwritten: fileStats.filesOverwritten,
    filesSkipped: fileStats.filesSkipped,
  });

  log.info(`État enregistré dans _state/installed.json`);
}

// ==================== Main ====================
async function main() {
  log.banner("🏗️  MODULE 00 — ARCHITECTURE");
  console.log("");
  console.log("  Création de l'arborescence du projet Job Africa");
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN activé : aucune modification réelle");
    console.log("");
  }

  // ==================== Vérification préalable ====================
  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Le module 00 est déjà installé.");
    log.info("Utilisez --force pour réinstaller, ou --uninstall pour supprimer.");
    console.log("");
    log.info("Pour voir l'état des modules : node run.js --status");
    process.exit(0);
  }

  // ==================== Désinstallation ====================
  if (OPTIONS.uninstall) {
    stepUninstall();
    return;
  }

  // ==================== Création ====================
  const dirStats = stepCreateDirectories();
  const fileStats = stepCreateBaseFiles();
  stepRegister(dirStats, fileStats);

  // ==================== Résumé ====================
  showSummary({
    dirs: dirStats.created,
    filesCreated: fileStats.filesCreated,
    filesOverwritten: fileStats.filesOverwritten,
    filesSkipped: fileStats.filesSkipped,
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