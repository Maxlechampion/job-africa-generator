#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 16b — FIX KKIAPAY (payment.js + backend + widget)
 * ═══════════════════════════════════════════════════════════════
 *
 * Corrige définitivement l'intégration KKiaPay :
 *   - payment.js retourne bien la config kkiapay
 *   - payments.py retourne bien kkiapay dans la réponse
 *   - BoostButton.vue ouvre le widget KKiaPay
 *
 * FICHIERS MODIFIÉS (3) :
 *   frontend/src/services/payment.js
 *   backend/app/api/payments.py
 *   frontend/src/components/jobs/BoostButton.vue
 *
 * USAGE :
 *   node 16b-fix-kkiapay.js [options]
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

const MODULE_ID = "16b";
const MODULE_NAME = "Fix KKiaPay";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/api/payments.py",
  "frontend/src/services/payment.js",
  "frontend/src/components/jobs/BoostButton.vue",
];

// ==================== payment.js ====================

const PAYMENT_JS = `import axios from "axios";
import { supabase } from "./supabase";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 30000 });

// ==================== INTERCEPTEUR AUTH ====================
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = \`Bearer \${session.access_token}\`;
    }
  } catch (e) {
    console.warn("[PAYMENT] Erreur session :", e);
  }

  return config;
});

// ==================== GESTION ERREURS ====================
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[PAYMENT] 401 — Non authentifié");
    }
    return Promise.reject(error);
  }
);

// ==================== API ====================
export default {
  getTarifs: () =>
    api.get("/payments/tarifs").then((r) => r.data),

  initiate: (type, metadata = {}) =>
    api
      .post("/payments/initiate", { type, metadata })
      .then((r) => {
        console.log("[PAYMENT] Réponse initiate :", r.data);
        return r.data;
      }),

  getTransactions: () =>
    api.get("/payments/transactions").then((r) => r.data),

  getPremiumStatus: () =>
    api.get("/premium/status").then((r) => r.data),

  boostJob: (jobId) =>
    api.post(\`/premium/jobs/\${jobId}/boost\`).then((r) => r.data),

  getBanners: (placement) =>
    api.get(\`/sponsored/banners/\${placement}\`).then((r) => r.data),
};
`;

// ==================== payments.py ====================

const PAYMENTS_API = `"""
Routes API pour les paiements.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.payments import (
    TARIFS,
    MOYENS_PAR_PAYS,
    PAYMENT_PROVIDER,
    KKIAPAY_PUBLIC_KEY,
    KKIAPAY_SANDBOX,
)
from app.services.payment_service import (
    create_transaction,
    get_user_transactions,
    get_revenue_stats,
)


router = APIRouter(prefix="/payments", tags=["payments"])


class InitiatePaymentRequest(BaseModel):
    type: str
    metadata: Optional[dict] = None


@router.get("/tarifs")
def list_tarifs():
    """Liste des tarifs disponibles."""
    return {
        "provider": PAYMENT_PROVIDER,
        "tarifs": TARIFS,
        "moyens_par_pays": MOYENS_PAR_PAYS,
    }


@router.post("/initiate")
def initiate_payment(
    payload: InitiatePaymentRequest,
    user=Depends(get_current_user),
):
    """
    Cree une transaction en attente.

    Retourne les infos pour ouvrir le widget KKiaPay.
    """

    if payload.type not in TARIFS:
        raise HTTPException(400, f"Type de paiement inconnu : {payload.type}")

    # Cree la transaction
    transaction = create_transaction(
        user_id=user["id"],
        type=payload.type,
        metadata=payload.metadata or {},
        use_admin=True,
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    # Retourne les infos du widget
    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
        "devise": transaction["devise"],
        "provider": transaction["provider"],
        "statut": transaction["statut"],

        # Infos KKiaPay
        "kkiapay": {
            "public_key": KKIAPAY_PUBLIC_KEY,
            "sandbox": KKIAPAY_SANDBOX,
            "amount": transaction["montant"],
            "currency": transaction["devise"],
            "reference": transaction["reference"],
        },
    }


@router.get("/transactions")
def my_transactions(user=Depends(get_current_user)):
    """Liste des transactions de l'utilisateur."""
    return get_user_transactions(user["id"])


@router.get("/admin/revenue")
def revenue(user=Depends(get_current_user)):
    """Statistiques de revenus (admin uniquement)."""
    if user.get("user_role") != "admin":
        raise HTTPException(403, "Admin requis")
    return get_revenue_stats()
`;

// ==================== BoostButton.vue ====================

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

// ==================== Ouvrir le widget KKiaPay ====================
async function openKkiaPayWidget() {
  try {
    const result = await paymentApi.initiate("premium_job", {
      job_id: props.job.id,
    });

    console.log("[BOOST] Réponse API :", result);

    const kkiapay = result.kkiapay;

    if (!kkiapay) {
      throw new Error("Configuration KKiaPay manquante dans la réponse");
    }

    // Charger le SDK si nécessaire
    await loadKkiaPaySDK();

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

    // Écouter les événements
    if (window.addKkiapayListener) {
      window.addKkiapayListener("success", (response) => {
        console.log("[BOOST] KKiaPay success :", response);

        toast.success(
          "Paiement réussi !",
          "Votre offre sera boostée dans quelques instants."
        );

        emit("boosted", response);

        // Recharge après 2 secondes
        setTimeout(() => window.location.reload(), 2000);
      });

      window.addKkiapayListener("failed", (error) => {
        console.log("[BOOST] KKiaPay failed :", error);

        toast.error(
          "Paiement échoué",
          "Votre paiement n'a pas abouti. Réessayez."
        );
      });
    }
  } catch (e) {
    console.error("[BOOST] Erreur KKiaPay :", e);
    throw e;
  }
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
    await openKkiaPayWidget();
  } catch (e) {
    console.error("Erreur boost :", e);
    error.value = "Erreur lors de l'ouverture du paiement";
    toast.error("Erreur", error.value);
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
  "frontend/src/services/payment.js": PAYMENT_JS,
  "backend/app/api/payments.py": PAYMENTS_API,
  "frontend/src/components/jobs/BoostButton.vue": BOOST_BUTTON,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 16b — FIX KKIAPAY");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    log.info("Ce module ne fait que modifier des fichiers existants.");
    if (!OPTIONS.dryRun) markUninstalled(MODULE_ID);
    return;
  }

  log.section("Modification de " + Object.keys(FILES).length + " fichiers");

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
      note: "Fix KKiaPay : payment.js + payments.py + BoostButton.vue",
    });
  }

  log.banner("MODULE 16b — TERMINE");

  console.log("");
  console.log("  Fichiers modifies :");
  console.log("  - payment.js (retourne bien la config kkiapay)");
  console.log("  - payments.py (backend retourne kkiapay)");
  console.log("  - BoostButton.vue (ouvre le widget KKiaPay)");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Redemarrer Uvicorn");
  console.log("  2. Relancer le frontend");
  console.log("  3. Tester : cliquer sur 'Booster'");
  console.log("  4. Le widget KKiaPay doit s'ouvrir");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});