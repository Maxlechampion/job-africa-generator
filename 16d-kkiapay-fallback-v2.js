#!/usr/bin/env node

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

const MODULE_ID = "16d";
const MODULE_NAME = "Fallback KKiaPay v2";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "frontend/src/components/jobs/BoostButton.vue",
];

// ==================== BoostButton.vue (fallback intelligent) ====================

const BOOST_BUTTON = `<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import paymentApi from "@/services/payment";
import BaseButton from "@/components/ui/BaseButton.vue";

const props = defineProps({
  job: { type: Object, required: true },
  variant: { type: String, default: "button" },
});

const emit = defineEmits(["boosted"]);

const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();

const loading = ref(false);
const success = ref(false);
const error = ref("");

// Flag global pour suivre l'état KKiaPay
let kkiapayOpened = false;
let kkiapayFailed = false;

// ==================== Charger le SDK KKiaPay ====================
function loadKkiaPaySDK() {
  return new Promise((resolve, reject) => {
    if (window.openKkiapayWidget) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.kkiapay.me/k.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger KKiaPay"));

    document.head.appendChild(script);
  });
}

// ==================== Mode Widget KKiaPay ====================
async function tryKkiaPayWidget() {
  const result = await paymentApi.initiate("premium_job", {
    job_id: props.job.id,
  });

  console.log("[BOOST] Réponse API :", result);

  const kkiapay = result.kkiapay;

  if (!kkiapay) {
    throw new Error("Configuration KKiaPay manquante");
  }

  // Charger le SDK
  await loadKkiaPaySDK();

  // Réinitialiser les flags
  kkiapayOpened = false;
  kkiapayFailed = false;

  // Listener : success
  if (window.addKkiapayListener) {
    window.addKkiapayListener("success", (response) => {
      console.log("[BOOST] KKiaPay success :", response);
      kkiapayOpened = true;

      toast.success(
        "Paiement réussi !",
        "Votre offre sera boostée dans quelques instants."
      );

      emit("boosted", response);
      setTimeout(() => window.location.reload(), 2000);
    });

    // Listener : failed
    window.addKkiapayListener("failed", (error) => {
      console.log("[BOOST] KKiaPay failed :", error);
      kkiapayFailed = true;
    });
  }

  // Ouvrir le widget
  try {
    window.openKkiapayWidget({
      amount: kkiapay.amount,
      api_key: kkiapay.public_key,
      sandbox: kkiapay.sandbox,
      email: auth.userEmail || "client@jobafrica.app",
      name: auth.userEmail ? auth.userEmail.split("@")[0] : "Client",
      data: result.reference,
      theme: "#2f8f5c",
      position: "center",
    });
  } catch (e) {
    console.error("[BOOST] Erreur openKkiapayWidget :", e);
    throw new Error("Erreur ouverture KKiaPay");
  }

  // Attendre 5 secondes pour détecter si KKiaPay s'est vraiment ouvert
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Si KKiaPay n'a pas signalé d'erreur ET n'a pas été ouvert
  // → On suppose que le widget a échoué silencieusement
  if (kkiapayFailed) {
    throw new Error("KKiaPay a signalé un échec");
  }

  // Vérifier si le widget KKiaPay est présent dans le DOM
  const widgetElement = document.querySelector('[id*="kkiapay"]')
    || document.querySelector('[class*="kkiapay"]')
    || document.querySelector('iframe[src*="kkiapay"]');

  if (!widgetElement) {
    console.warn("[BOOST] Widget KKiaPay non détecté dans le DOM → fallback");
    throw new Error("Widget KKiaPay non détecté");
  }

  console.log("[BOOST] Widget KKiaPay détecté ✅");
  return { mode: "kkiapay", response: result };
}

// ==================== Mode Manual (fallback) ====================
async function fallbackManual() {
  console.log("[BOOST] Mode fallback : création manuelle");

  const result = await paymentApi.boostJob(props.job.id);

  console.log("[BOOST] Transaction manuelle :", result);

  if (!result || !result.reference) {
    throw new Error("Impossible de créer la transaction");
  }

  toast.payment(result.reference, result.montant, result.devise);

  emit("boosted", result);

  return { mode: "manual", response: result };
}

// ==================== Handler principal ====================
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
    await tryKkiaPayWidget();
    success.value = true;
  } catch (e) {
    console.warn("[BOOST] KKiaPay indisponible :", e.message);
    console.log("[BOOST] Bascule en mode fallback manual");

    try {
      await fallbackManual();
      success.value = true;
    } catch (fallbackError) {
      console.error("[BOOST] Fallback échoué :", fallbackError);
      error.value = "Impossible de créer la transaction";
      toast.error("Erreur", error.value);
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
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
      <span v-else-if="loading">Ouverture...</span>
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
      <span v-else-if="loading">Ouverture...</span>
      <span v-else>Booster cette offre (2000 FCFA)</span>
    </BaseButton>

    <div
      v-else
      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-sm font-medium"
    >
      Premium actif
    </div>
  </div>
</template>
`;

const FILES = {
  "frontend/src/components/jobs/BoostButton.vue": BOOST_BUTTON,
};

async function main() {
  log.banner("MODULE 16d — FALLBACK KKIAPAY v2");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    log.info("Ce module ne fait que modifier BoostButton.vue.");
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    return;
  }

  log.section("Modification de BoostButton.vue");

  const results = writeFiles(FILES, {
    overwrite: true,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s)"
  );

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesOverwritten: results.overwritten,
      note: "Fallback intelligent : detection widget dans le DOM",
    });
  }

  log.banner("MODULE 16d — TERMINE");

  console.log("");
  console.log("  Ameliorations :");
  console.log("  - Attente 5 secondes apres openKkiapayWidget");
  console.log("  - Detection du widget dans le DOM");
  console.log("  - Detection des erreurs KKiaPay");
  console.log("  - Fallback automatique si widget absent");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Relancer le frontend (npm run dev)");
  console.log("  2. Tester : cliquer 'Booster cette offre'");
  console.log("  3. Le fallback s'active automatiquement");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});