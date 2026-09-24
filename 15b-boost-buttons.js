#!/usr/bin/env node

/**
 * MODULE 15b — BOUTONS "BOOSTER" SUR LES OFFRES
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

const MODULE_ID = "15b";
const MODULE_NAME = "Boutons Booster";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "frontend/src/components/jobs/JobCard.vue",
  "frontend/src/views/JobDetailView.vue",
  "frontend/src/services/payment.js",
  "backend/app/services/job_service.py",
];

// ==================== BoostButton.vue ====================

const BOOST_BUTTON = `<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  job: { type: Object, required: true },
  variant: { type: String, default: "button" },
});

const emit = defineEmits(["boosted"]);

const router = useRouter();
const auth = useAuthStore();

const loading = ref(false);
const success = ref(false);
const error = ref("");

async function handleBoost() {
  error.value = "";

  if (!auth.isAuthenticated) {
    router.push({
      name: "login",
      query: { redirect: "/jobs/" + props.job.id },
    });
    return;
  }

  loading.value = true;

  try {
    const result = await paymentApi.boostJob(props.job.id);

    if (result && result.reference) {
      success.value = true;

      const message =
        "Transaction creee !\\n\\n" +
        "Reference : " + result.reference + "\\n" +
        "Montant : " + result.montant + " FCFA\\n\\n" +
        "Votre offre sera boostee des confirmation du paiement.";

      alert(message);

      emit("boosted", result);

      setTimeout(function () {
        window.location.reload();
      }, 1000);
    }
  } catch (e) {
    console.error("Erreur boost :", e);
    error.value = "Erreur lors de la creation de la transaction";
    alert(error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <button
    v-if="variant === 'icon' && !job.is_premium"
    class="w-9 h-9 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 transition"
    title="Booster cette offre (2000 FCFA)"
    :disabled="loading || success"
    @click.stop.prevent="handleBoost"
  >
    <span v-if="success" class="text-lg">OK</span>
    <span v-else-if="loading" class="text-lg">...</span>
    <span v-else class="text-lg">*</span>
  </button>

  <button
    v-else-if="variant === 'compact' && !job.is_premium"
    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-600 hover:bg-amber-50 transition"
    :disabled="loading || success"
    @click.stop.prevent="handleBoost"
  >
    <span v-if="success">Boosté</span>
    <span v-else-if="loading">Création...</span>
    <span v-else>Booster</span>
  </button>

  <BaseButton
    v-else-if="variant === 'button' && !job.is_premium"
    variant="outline"
    size="md"
    class="w-full"
    :disabled="loading || success"
    @click.stop.prevent="handleBoost"
  >
    <span v-if="success">Boosté</span>
    <span v-else-if="loading">Création...</span>
    <span v-else>Booster cette offre (2000 FCFA)</span>
  </BaseButton>

  <div
    v-else
    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-sm font-medium"
  >
    Premium actif
  </div>
</template>
`;

// ==================== Fichiers ====================

const FILES = {
  "frontend/src/components/jobs/BoostButton.vue": BOOST_BUTTON,
};

// ==================== Patch JobCard.vue ====================

function patchJobCard() {
  const jobCardPath = "frontend/src/components/jobs/JobCard.vue";
  const fullPath = path.join(ROOT, jobCardPath);

  if (!fs.existsSync(fullPath)) {
    log.error("Fichier " + jobCardPath + " introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("BoostButton")) {
    log.info("JobCard.vue deja patche");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "frontend", "src");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "JobCard.vue"));
  } catch (e) {
    log.warn("Backup impossible : " + e.message);
  }

  // Patch 1 : ajouter l'import
  content = content.replace(
    /(<script setup>)([\s\S]*?)(<\/script>)/,
    function (match, open, inner, close) {
      if (inner.includes("BoostButton")) return match;
      return open + inner + "\nimport BoostButton from \"./BoostButton.vue\";\n" + close;
    }
  );

  // Patch 2 : ajouter le bouton au survol
  content = content.replace(
    /(<\/RouterLink>)/,
    "  <div class=\"absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity\">\n" +
    "    <BoostButton :job=\"job\" variant=\"icon\" />\n" +
    "  </div>\n" +
    "$1"
  );

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(jobCardPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch JobDetailView.vue ====================

function patchJobDetail() {
  const jobDetailPath = "frontend/src/views/JobDetailView.vue";
  const fullPath = path.join(ROOT, jobDetailPath);

  if (!fs.existsSync(fullPath)) {
    log.error("Fichier " + jobDetailPath + " introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("BoostButton")) {
    log.info("JobDetailView.vue deja patche");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "frontend", "src");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "JobDetailView.vue"));
  } catch (e) {
    log.warn("Backup impossible : " + e.message);
  }

  // Patch : ajouter l'import
  content = content.replace(
    /(<script setup>)([\s\S]*?)(<\/script>)/,
    function (match, open, inner, close) {
      if (inner.includes("BoostButton")) return match;
      return open + inner + "\nimport BoostButton from \"@/components/jobs/BoostButton.vue\";\n" + close;
    }
  );

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(jobDetailPath + " (patché)", "overwritten");
  return true;
}

// ==================== Patch job_service.py ====================

function patchJobService() {
  const servicePath = "backend/app/services/job_service.py";
  const fullPath = path.join(ROOT, servicePath);

  if (!fs.existsSync(fullPath)) {
    log.error("Fichier " + servicePath + " introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("boost_score")) {
    log.info("job_service.py deja patche");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "job_service.py"));
  } catch (e) {
    log.warn("Backup impossible : " + e.message);
  }

  content = content.replace(
    /\.order\("created_at",\s*desc=True\)/,
    ".order(\"boost_score\", desc=True)\n        .order(\"created_at\", desc=True)"
  );

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(servicePath + " (patché)", "overwritten");
  return true;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 15b — BOUTONS BOOSTER");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
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

  log.section("Creation de " + Object.keys(FILES).length + " fichier");

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s), " + results.skipped + " ignore(s)"
  );

  log.section("Patch de JobCard.vue");
  patchJobCard();

  log.section("Patch de JobDetailView.vue");
  patchJobDetail();

  log.section("Patch de job_service.py (tri par boost)");
  patchJobService();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
      patched: [
        "frontend/src/components/jobs/JobCard.vue",
        "frontend/src/views/JobDetailView.vue",
        "backend/app/services/job_service.py",
      ],
    });
  }

  log.banner("MODULE 15b — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Modifications :");
  console.log("  - BoostButton.vue (nouveau)");
  console.log("  - JobCard.vue (bouton survol)");
  console.log("  - JobDetailView.vue (bouton dans sidebar)");
  console.log("  - job_service.py (tri par boost_score)");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. cd frontend && npm run dev");
  console.log("  2. cd backend && uvicorn app.main:app --reload --reload-dir app");
  console.log("  3. Tester dans le navigateur");
  console.log("");
}

main().catch(function (e) {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});