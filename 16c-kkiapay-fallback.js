#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 16c — FALLBACK KKiaPay
 * ═══════════════════════════════════════════════════════════════
 *
 * Implémente un mode fallback pour KKiaPay :
 *   - Si le widget KKiaPay s'ouvre → mode widget
 *   - Si le widget échoue → fallback en mode manual
 *   - L'utilisateur n'est jamais bloqué
 *
 * FICHIERS MODIFIÉS (1) :
 *   frontend/src/components/jobs/BoostButton.vue
 *
 * USAGE :
 *   node 16c-kkiapay-fallback.js [options]
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

const MODULE_ID = "16c";
const MODULE_NAME = "Fallback KKiaPay";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "frontend/src/components/jobs/BoostButton.vue",
  "frontend/src/services/payment.js",
];

// ==================== BoostButton.vue (avec fallback) ====================

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

  // Ouvrir le widget
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Timeout de 30 secondes
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Timeout KKiaPay"));
      }
    }, 30000);

    // Écouter les événements
    if (window.addKkiapayListener) {
      window.addKkiapayListener("success", (response) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        console.log("[BOOST] KKiaPay success :", response);

        toast.success(
          "Paiement réussi !",
          "Votre offre sera boostée dans quelques instants."
        );

        emit("boosted", response);
        resolve({ mode: "kkiapay", response });

        setTimeout(() => window.location.reload(), 2000);
      });

      window.addKkiapayListener("failed", (error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        console.log("[BOOST] KKiaPay failed :", error);
        reject(new Error("Paiement KKiaPay échoué"));
      });
    }

    // Ouvrir le widget
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
  });
}

// ==================== Mode Manual (fallback) ====================
async function fallbackManual() {
  console.log("[BOOST] Mode fallback : création manuelle");

  const result = await paymentApi.boostJob(props.job.id);

  console.log("[BOOST] Transaction manuelle :", result);

  if (!result || !result.reference) {
    throw new Error("Impossible de créer la transaction");
  }

  // Afficher la card toast
  toast.payment(result.reference, result.montant, result.devise);

  emit("boosted", result);

  return { mode: "manual", response: result };
}

// ==================== Handler principal ====================
async function handleBoost() {
  error.value = "";

  // Vérifier l'authentification
  if (!auth.isAuthenticated) {
    router.push({
      name: "login",
      query: { redirect: "/jobs/" + props.job.id },
    });
    return;
  }

  loading.value = true;

  try {
    // Tentative 1 : Widget KKiaPay
    await tryKkiaPayWidget();
    success.value = true;
  } catch (e) {
    console.warn("[BOOST] KKiaPay indisponible :", e.message);
    console.log("[BOOST] Bascule en mode fallback manual");

    // Tentative 2 : Fallback manual
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
    <!-- Variante icône -->
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

    <!-- Variante compacte -->
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

    <!-- Variante bouton normal -->
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

    <!-- Offre déjà boostée -->
    <div
      v-else
      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 text-sm font-medium"
    >
      Premium actif
    </div>
  </div>
</template>
`;

// ==================== Fichiers ====================

const FILES = {
  "frontend/src/components/jobs/BoostButton.vue": BOOST_BUTTON,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 16c — FALLBACK KKIAPAY");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    log.info("Ce module ne fait que modifier BoostButton.vue.");
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    return;
  }

  log.section("Modification de " + Object.keys(FILES).length + " fichier");

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
      note: "Fallback KKiaPay : widget → manual",
    });
  }

  log.banner("MODULE 16c — TERMINE");

  console.log("");
  console.log("  Modifications :");
  console.log("  - BoostButton.vue (fallback KKiaPay → manual)");
  console.log("");
  console.log("  Comportement :");
  console.log("  1. Clic 'Booster' → tentative widget KKiaPay");
  console.log("  2. Si widget echoue (compte non active, etc.)");
  console.log("  3. → fallback manual (cree transaction en base)");
  console.log("  4. → card toast affichee");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Relancer le frontend (npm run dev)");
  console.log("  2. Tester : cliquer 'Booster cette offre'");
  console.log("  3. Le fallback s'active automatiquement si KKiaPay echoue");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});