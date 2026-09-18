#!/usr/bin/env node

/**
 * Runner principal du générateur Job Africa.
 *
 * Usage :
 *   node run.js --all              → Installe tous les modules
 *   node run.js --status           → Affiche l'état des modules
 *   node run.js --list             → Liste les modules disponibles
 *   node run.js --only 01,02,03    → Installe uniquement les modules 01, 02, 03
 *   node run.js --uninstall 05     → Désinstalle le module 05
 *   node run.js --force            → Force la réinstallation
 *   node run.js --dry-run          → Simule sans écrire
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import { log } from "./_lib/logger.js";
import { listModules } from "./_lib/registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== Modules disponibles ====================
const MODULES = [
  { id: "00", file: "00-architecture.js", name: "Architecture" },
  { id: "01", file: "01-backend-base.js", name: "Backend Base" },
  { id: "02", file: "02-collectors.js", name: "Collecteurs" },
  { id: "03", file: "03-scheduler.js", name: "Scheduler" },
  { id: "04", file: "04-deduplication.js", name: "Déduplication" },
  { id: "05", file: "05-ai-huggingface.js", name: "IA Hugging Face" },
  { id: "06", file: "06-database-enriched.js", name: "Base enrichie" },
  { id: "07", file: "07-frontend-vue.js", name: "Frontend Vue" },
  { id: "08", file: "08-admin-dashboard.js", name: "Dashboard Admin" },
  { id: "09", file: "09-cicd-deployment.js", name: "CI/CD" },
  { id: "10", file: "10-pwa.js", name: "PWA" },
  { id: "11", file: "11-auth-supabase.js", name: "Auth Supabase" },
  { id: "12", file: "12-i18n.js", name: "Multi-langue" },
  { id: "13", file: "13-social-share.js", name: "Partage social" },
  { id: "14", file: "14-monetization.js", name: "Monétisation" },
  { id: "15", file: "15-push-notifications.js", name: "Notifications push" },
];

// ==================== Parse arguments ====================
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: args.includes("--all"),
    status: args.includes("--status"),
    list: args.includes("--list"),
    force: args.includes("--force"),
    dryRun: args.includes("--dry-run"),
    skipExisting: args.includes("--skip-existing"),
    uninstall: args.includes("--uninstall"),
    only: null,
  };

  const onlyIndex = args.indexOf("--only");
  if (onlyIndex !== -1 && args[onlyIndex + 1]) {
    options.only = args[onlyIndex + 1].split(",");
  }

  const uninstallIndex = args.indexOf("--uninstall");
  if (uninstallIndex !== -1 && args[uninstallIndex + 1]) {
    options.uninstall = args[uninstallIndex + 1];
  }

  return options;
}

// ==================== Exécuter un module ====================
function runModule(module, options = {}) {
  return new Promise((resolve, reject) => {
    log.section(`Module ${module.id} — ${module.name}`);

    const args = [];
    if (options.force) args.push("--force");
    if (options.dryRun) args.push("--dry-run");
    if (options.skipExisting) args.push("--skip-existing");
    if (options.uninstall) args.push("--uninstall");

    const child = spawn("node", [module.file, ...args], {
      cwd: __dirname,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Module ${module.id} échoué (code ${code})`));
    });

    child.on("error", reject);
  });
}

// ==================== Afficher l'état ====================
function showStatus() {
  log.banner("📊 État des modules Job Africa");

  const installed = listModules();
  const installedMap = new Map(installed.map((m) => [m.id, m]));

  console.log("");
  console.log("  ID  | Module                        | Statut");
  console.log("  ────┼───────────────────────────────┼────────────");

  for (const m of MODULES) {
    const state = installedMap.get(m.id);
    let status = "non installé";

    if (state && state.active) {
      status = "✅ installé";
    } else if (state && !state.active) {
      status = "⏸️  désinstallé";
    }

    const name = m.name.padEnd(30);
    console.log(`  ${m.id}  | ${name} | ${status}`);
  }
  console.log("");
}

// ==================== Lister les modules ====================
function showList() {
  log.banner("📋 Modules disponibles");

  console.log("");
  for (const m of MODULES) {
    console.log(`  ${m.id}  →  ${m.name}`);
  }
  console.log("");
  console.log("  Utilisation : node run.js --only 01,02,03");
  console.log("");
}

// ==================== Main ====================
async function main() {
  const options = parseArgs();

  if (options.status) {
    showStatus();
    return;
  }

  if (options.list) {
    showList();
    return;
  }

  let modulesToRun = [];

  if (options.all) {
    modulesToRun = MODULES;
  } else if (options.only) {
    modulesToRun = MODULES.filter((m) => options.only.includes(m.id));
  } else if (options.uninstall) {
    modulesToRun = MODULES.filter((m) => m.id === options.uninstall);
  } else {
    log.info("Aucune action spécifiée.");
    console.log("");
    console.log("  node run.js --all              Installer tous les modules");
    console.log("  node run.js --only 01,02,03    Installer des modules spécifiques");
    console.log("  node run.js --status           Voir l'état");
    console.log("  node run.js --list             Lister les modules");
    console.log("  node run.js --uninstall 05     Désinstaller un module");
    console.log("");
    return;
  }

  log.banner(`🚀 Exécution de ${modulesToRun.length} module(s)`);

  for (const module of modulesToRun) {
    try {
      await runModule(module, options);
    } catch (e) {
      log.error(`Module ${module.id} échoué : ${e.message}`);
      if (!options.force) {
        log.warn("Arrêt de l'exécution.");
        process.exit(1);
      }
    }
  }

  log.banner("🎉 Terminé !");
  console.log("");
  log.info("Prochaines étapes :");
  console.log("  1. cd backend && python -m venv venv");
  console.log("  2. pip install -r requirements.txt");
  console.log("  3. uvicorn app.main:app --reload");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  process.exit(1);
});
