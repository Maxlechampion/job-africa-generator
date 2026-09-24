#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 16 — KKIAPAY (Mobile Money réel - Sandbox)
 * ═══════════════════════════════════════════════════════════════
 *
 * Intègre KKiaPay pour les paiements Mobile Money réels.
 *
 * USAGE :
 *   node 16-kkiapay.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle
 *   --dry-run        Simule sans écrire
 *   --uninstall      Désinstalle
 *
 * PRÉREQUIS :
 *   - Modules 00, 01, 14, 15b installés
 *   - Compte KKiaPay Sandbox validé
 *   - Clés API KKiaPay
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

const MODULE_ID = "16";
const MODULE_NAME = "KKiaPay";
const MODULE_VERSION = "1.0.0";

// ==================== Clés KKiaPay (Sandbox) ====================
const KKIAPAY_PUBLIC_KEY = "832a1e38086dd4c4e3dc0fe21b0d9d37a6dbabd0";
const KKIAPAY_PRIVATE_KEY = "pk_44447240141f408206f9d2653e7a80d2d3db48a282d3f2a99814d34fb3d40a33";
const KKIAPAY_SECRET = "sk_c9d670d6db44df1f95517fdf18985860c8eb22e7fae391a161e2edc53b0502ce";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/core/payments.py",
  "backend/app/services/payment_service.py",
  "frontend/src/services/payment.js",
];

// ==================== Backend : core/payments.py ====================

const PAYMENTS_CONFIG = `"""
Configuration des agregateurs de paiement pour l'Afrique de l'Ouest.
"""

import os


# ==================== Agregateur actif ====================
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "kkiapay")


# ==================== KKiaPay ====================
KKIAPAY_PUBLIC_KEY = os.getenv(
    "KKIAPAY_PUBLIC_KEY",
    "832a1e38086dd4c4e3dc0fe21b0d9d37a6dbabd0",
)

KKIAPAY_PRIVATE_KEY = os.getenv(
    "KKIAPAY_PRIVATE_KEY",
    "pk_44447240141f408206f9d2653e7a80d2d3db48a282d3f2a99814d34fb3d40a33",
)

KKIAPAY_SECRET = os.getenv(
    "KKIAPAY_SECRET",
    "sk_c9d670d6db44df1f95517fdf18985860c8eb22e7fae391a161e2edc53b0502ce",
)

KKIAPAY_SANDBOX = os.getenv("KKIAPAY_SANDBOX", "true").lower() == "true"


# ==================== FedaPay (backup) ====================
FEDAPAY_SECRET_KEY = os.getenv("FEDAPAY_SECRET_KEY", "")
FEDAPAY_PUBLIC_KEY = os.getenv("FEDAPAY_PUBLIC_KEY", "")


# ==================== Paystack (backup) ====================
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")


# ==================== Tarifs ====================
TARIFS = {
    "premium_job": {
        "prix": 2000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Offre mise en avant pendant 30 jours",
    },
    "subscription_premium": {
        "prix": 5000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Abonnement candidat premium - 30 jours",
    },
    "subscription_pro": {
        "prix": 15000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Abonnement pro - 30 jours",
    },
    "sponsored_job": {
        "prix": 25000,
        "devise": "XOF",
        "duree_jours": 30,
        "description": "Offre sponsorisee entreprise - 30 jours",
    },
    "banner_week": {
        "prix": 50000,
        "devise": "XOF",
        "duree_jours": 7,
        "description": "Banniere publicitaire - 1 semaine",
    },
}


# ==================== Moyens de paiement par pays ====================
MOYENS_PAR_PAYS = {
    "Benin": [
        {"id": "mtn_momo", "label": "MTN MoMo", "icone": "📱"},
        {"id": "moov_money", "label": "Moov Money", "icone": "📱"},
        {"id": "celtiis", "label": "Celtiis", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Togo": [
        {"id": "flooz", "label": "Flooz (Moov)", "icone": "📱"},
        {"id": "tmoney", "label": "T-Money (Togocom)", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Cote d'Ivoire": [
        {"id": "orange_money", "label": "Orange Money", "icone": "📱"},
        {"id": "mtn_momo", "label": "MTN MoMo", "icone": "📱"},
        {"id": "moov_money", "label": "Moov Money", "icone": "📱"},
        {"id": "wave", "label": "Wave", "icone": "🌊"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Senegal": [
        {"id": "wave", "label": "Wave", "icone": "🌊"},
        {"id": "orange_money", "label": "Orange Money", "icone": "📱"},
        {"id": "free_money", "label": "Free Money", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Niger": [
        {"id": "airtel_money", "label": "Airtel Money", "icone": "📱"},
        {"id": "orange_money", "label": "Orange Money", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Ghana": [
        {"id": "mtn_momo", "label": "MTN MoMo", "icone": "📱"},
        {"id": "vodafone_cash", "label": "Vodafone Cash", "icone": "📱"},
        {"id": "visa", "label": "Visa / Mastercard", "icone": "💳"},
    ],
    "Nigeria": [
        {"id": "paystack", "label": "Paystack", "icone": "💳"},
        {"id": "flutterwave", "label": "Flutterwave", "icone": "💳"},
        {"id": "bank_transfer", "label": "Virement bancaire", "icone": "🏦"},
    ],
}
`;

// ==================== Backend : services/kkiapay_service.py ====================

const KKIAPAY_SERVICE = `"""
Service KKiaPay — Verification des transactions.

Documentation : https://docs.kkiapay.me
"""

import hmac
import hashlib

import httpx

from app.core.config import settings
from app.core.logger import get_logger
from app.core.payments import (
    KKIAPAY_PUBLIC_KEY,
    KKIAPAY_PRIVATE_KEY,
    KKIAPAY_SECRET,
    KKIAPAY_SANDBOX,
)


logger = get_logger(__name__)


def get_api_base_url() -> str:
    """Retourne l'URL de base de l'API KKiaPay."""
    if KKIAPAY_SANDBOX:
        return "https://api-sandbox.kkiapay.me"
    return "https://api.kkiapay.me"


def verify_transaction(transaction_id: str) -> dict | None:
    """
    Verifie une transaction KKiaPay via l'API.

    Args:
        transaction_id: ID de la transaction KKiaPay

    Returns:
        Dict avec les details ou None si echec
    """

    url = f"{get_api_base_url()}/api/v1/transactions/{transaction_id}"

    headers = {
        "x-public-key": KKIAPAY_PUBLIC_KEY,
        "x-private-key": KKIAPAY_PRIVATE_KEY,
        "Accept": "application/json",
    }

    try:
        with httpx.Client(timeout=15) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

            logger.info(f"Transaction KKiaPay verifiee : {transaction_id}")
            return data

    except httpx.HTTPError as e:
        logger.error(f"Erreur verification KKiaPay : {e}")
        return None


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verifie la signature d'un webhook KKiaPay.

    Args:
        payload: Corps brut de la requete
        signature: Header 'x-kkiapay-signature'

    Returns:
        True si la signature est valide
    """

    if not KKIAPAY_SECRET:
        logger.warning("KKIAPAY_SECRET manquant — signature non verifiee")
        return True

    expected = hmac.new(
        KKIAPAY_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


def is_payment_successful(data: dict) -> bool:
    """Verifie si un paiement KKiaPay est reussi."""

    status = data.get("status", "").lower()
    return status in ("success", "successful", "paid", "completed")
`;

// ==================== Backend : api/webhooks.py ====================

const WEBHOOKS_API = `"""
Routes API pour les webhooks des agregateurs de paiement.
"""

from fastapi import APIRouter, Header, HTTPException, Request

from app.core.logger import get_logger
from app.services.payment_service import confirm_transaction
from app.services.kkiapay_service import (
    is_payment_successful,
    verify_webhook_signature,
)


logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/kkiapay")
async def kkiapay_webhook(
    request: Request,
    x_kkiapay_signature: str | None = Header(None),
):
    """
    Webhook KKiaPay — recoit les notifications de paiement.
    """

    body = await request.body()

    # Verifie la signature
    if x_kkiapay_signature:
        if not verify_webhook_signature(body, x_kkiapay_signature):
            logger.warning("Signature KKiaPay invalide")
            raise HTTPException(401, "Signature invalide")

    # Parse le JSON
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "JSON invalide")

    logger.info(f"Webhook KKiaPay recu : {data}")

    # Extrait la reference (notre reference JA-2026-XXXX)
    reference = (
        data.get("reference")
        or data.get("data", {}).get("reference")
        or data.get("transaction", {}).get("reference")
    )

    if not reference:
        logger.warning("Webhook KKiaPay sans reference")
        return {"status": "ignored", "reason": "no reference"}

    # Verifie le statut
    if is_payment_successful(data):
        result = confirm_transaction(reference, use_admin=True)

        if result:
            logger.info(f"Transaction {reference} confirmee via webhook")
            return {"status": "ok", "reference": reference}

        logger.warning(f"Transaction {reference} introuvable")
        return {"status": "not_found", "reference": reference}

    # Paiement echoue
    logger.info(f"Paiement KKiaPay non reussi : {data.get('status')}")
    return {"status": "ignored", "reason": data.get("status", "unknown")}


@router.get("/kkiapay/health")
def kkiapay_webhook_health():
    """Endpoint de sante pour tester le webhook."""
    return {"status": "ok", "provider": "kkiapay"}
`;

// ==================== Backend : api/payments.py (mis à jour) ====================

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

// ==================== Frontend : composant KKiaPayWidget.vue ====================

const KKIAPAY_WIDGET = `<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import paymentApi from "@/services/payment";

const props = defineProps({
  type: { type: String, required: true },
  metadata: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["success", "cancel", "error"]);

const auth = useAuthStore();
const toast = useToastStore();

const loading = ref(true);
const widgetReady = ref(false);

let widgetInstance = null;

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

// ==================== Ouvrir le widget ====================
async function openWidget() {
  try {
    const result = await paymentApi.initiate(props.type, props.metadata);

    const kkiapay = result.kkiapay;

    if (!kkiapay) {
      throw new Error("Configuration KKiaPay manquante");
    }

    // Ouvre le widget KKiaPay
    window.openKkiapayWidget({
      amount: kkiapay.amount,
      api_key: kkiapay.public_key,
      sandbox: kkiapay.sandbox,
      email: auth.userEmail || "client@jobafrica.app",
      name: auth.userEmail?.split("@")[0] || "Client",
      data: result.reference, // Reference JA-2026-XXXX
      theme: "#2f8f5c",
      position: "center",
      callback: "https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs",
    });

    loading.value = false;
    widgetReady.value = true;
  } catch (e) {
    console.error("Erreur ouverture widget :", e);
    loading.value = false;
    toast.error("Erreur", "Impossible d'ouvrir le widget de paiement");
    emit("error", e);
  }
}

// ==================== Listener ====================
function setupListeners() {
  if (!window.addKkiapayListener) return;

  window.addKkiapayListener("success", (response) => {
    console.log("KkiaPay success :", response);

    toast.success(
      "Paiement réussi !",
      "Votre offre sera boostée dans quelques instants."
    );

    emit("success", response);

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  });

  window.addKkiapayListener("failed", (error) => {
    console.log("KkiaPay failed :", error);

    toast.error(
      "Paiement échoué",
      "Votre paiement n'a pas abouti. Réessayez."
    );

    emit("error", error);
  });
}

onMounted(async () => {
  try {
    await loadKkiaPaySDK();
    setupListeners();
    await openWidget();
  } catch (e) {
    loading.value = false;
    emit("error", e);
  }
});

onUnmounted(() => {
  if (window.removeKkiapayListener) {
    window.removeKkiapayListener("success");
    window.removeKkiapayListener("failed");
  }
});
</script>

<template>
  <div class="text-center py-8">
    <div v-if="loading" class="space-y-3">
      <div class="w-10 h-10 mx-auto border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      <p class="text-sm text-slate-500">Ouverture du paiement...</p>
    </div>

    <div v-else-if="widgetReady" class="space-y-3">
      <div class="text-4xl">💳</div>
      <p class="text-sm text-slate-600">
        Widget KKiaPay ouvert. Suivez les instructions.
      </p>
      <button
        class="text-xs text-brand-600 hover:underline"
        @click="openWidget"
      >
        Rouvrir le widget
      </button>
    </div>
  </div>
</template>
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/core/payments.py": PAYMENTS_CONFIG,
  "backend/app/services/kkiapay_service.py": KKIAPAY_SERVICE,
  "backend/app/api/webhooks.py": WEBHOOKS_API,
  "backend/app/api/payments.py": PAYMENTS_API,
  "frontend/src/components/monetization/KKiaPayWidget.vue": KKIAPAY_WIDGET,
};

// ==================== Patch main.py ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error("Fichier " + mainPath + " introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("webhooks")) {
    log.info("main.py deja patche (webhooks present)");
    return true;
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));
  } catch (e) {
    log.warn("Backup impossible : " + e.message);
  }

  // Ajoute l'import
  content = content.replace(
    /from app\.api import \(([\s\S]*?)\)/,
    function (match, inner) {
      if (inner.includes("webhooks")) return match;
      return "from app.api import (" + inner.trimEnd() + "\\n    webhooks,\\n)";
    }
  );

  // Ajoute le router
  if (!content.includes("app.include_router(webhooks.router)")) {
    content = content.replace(
      /app\.include_router\(sponsored\.router\)/,
      "app.include_router(sponsored.router)\\napp.include_router(webhooks.router)"
    );
  }

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(mainPath + " (patché)", "overwritten");
  return true;
}

// ==================== Mise à jour .env ====================

function updateEnv() {
  const envPath = "backend/.env";
  const fullPath = path.join(ROOT, envPath);

  if (!fs.existsSync(fullPath)) {
    log.error(".env introuvable");
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("KKIAPAY_PUBLIC_KEY")) {
    log.info(".env deja configure (KKiaPay)");
    return true;
  }

  const kkiapayConfig = [
    "",
    "# ==================== KKIAPAY ====================",
    "PAYMENT_PROVIDER=kkiapay",
    "KKIAPAY_PUBLIC_KEY=" + KKIAPAY_PUBLIC_KEY,
    "KKIAPAY_PRIVATE_KEY=" + KKIAPAY_PRIVATE_KEY,
    "KKIAPAY_SECRET=" + KKIAPAY_SECRET,
    "KKIAPAY_SANDBOX=true",
    "",
  ].join("\\n");

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content + kkiapayConfig, "utf8");
  }

  log.file(envPath + " (mis à jour)", "overwritten");
  return true;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 16 — KKIAPAY");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
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
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s), " + results.skipped + " ignore(s)"
  );

  log.section("Patch de main.py");
  patchMainPy();

  log.section("Configuration .env");
  updateEnv();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
      sandbox: true,
    });
  }

  log.banner("MODULE 16 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  Configuration :");
  console.log("  - KKIAPAY_PUBLIC_KEY :", KKIAPAY_PUBLIC_KEY);
  console.log("  - KKIAPAY_PRIVATE_KEY : pk_...");
  console.log("  - KKIAPAY_SECRET : sk_...");
  console.log("  - KKIAPAY_SANDBOX : true");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Redemarrer Uvicorn");
  console.log("     uvicorn app.main:app --reload --reload-dir app");
  console.log("");
  console.log("  2. Tester le widget sur Vercel :");
  console.log("     - Cliquer sur 'Booster'");
  console.log("     - Le widget KKiaPay s'ouvre");
  console.log("     - Utiliser les numeros de test");
  console.log("");
  console.log("  3. Numeros de test KKiaPay Sandbox :");
  console.log("     - MTN : 66000001");
  console.log("     - Moov : 66000002");
  console.log("     - Wave : 66000003");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});