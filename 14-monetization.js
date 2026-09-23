#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 14 — MONÉTISATION
 * ═══════════════════════════════════════════════════════════════
 *
 * Ajoute la monétisation de la plateforme :
 *   - Offres premium (boost)
 *   - Abonnements candidat
 *   - Offres sponsorisées
 *   - Bannières publicitaires
 *
 * USAGE :
 *   node 14-monetization.js [options]
 *
 * PRÉREQUIS :
 *   - Modules 00, 01, 07, 11 installés
 *   - Tables transactions, subscriptions, banners créées dans Supabase
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

const MODULE_ID = "14";
const MODULE_NAME = "Monétisation";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/main.py",
  "backend/app/services/job_service.py",
  "frontend/src/views/HomeView.vue",
];

// ==================== Backend : core/payments.py ====================

const PAYMENTS_CONFIG = `"""
Configuration des agregateurs de paiement pour l'Afrique de l'Ouest.
"""

import os


# ==================== Agregateur actif ====================
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "manual")


# ==================== KKiaPay ====================
KKIAPAY_PUBLIC_KEY = os.getenv("KKIAPAY_PUBLIC_KEY", "")
KKIAPAY_PRIVATE_KEY = os.getenv("KKIAPAY_PRIVATE_KEY", "")
KKIAPAY_SECRET = os.getenv("KKIAPAY_SECRET", "")


# ==================== FedaPay ====================
FEDAPAY_SECRET_KEY = os.getenv("FEDAPAY_SECRET_KEY", "")
FEDAPAY_PUBLIC_KEY = os.getenv("FEDAPAY_PUBLIC_KEY", "")


# ==================== Paystack ====================
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")


# ==================== Flutterwave ====================
FLUTTERWAVE_SECRET_KEY = os.getenv("FLUTTERWAVE_SECRET_KEY", "")
FLUTTERWAVE_PUBLIC_KEY = os.getenv("FLUTTERWAVE_PUBLIC_KEY", "")


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

// ==================== Backend : services/payment_service.py ====================

const PAYMENT_SERVICE = `"""
Service de paiement abstrait.
"""

import uuid
from datetime import datetime, timezone

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.core.payments import PAYMENT_PROVIDER, TARIFS


logger = get_logger(__name__)

TABLE = "transactions"


def generate_reference() -> str:
    """Genere une reference unique."""
    year = datetime.now().year
    short = uuid.uuid4().hex[:8].upper()
    return f"JA-{year}-{short}"


def create_transaction(
    user_id: str | None,
    type: str,
    montant: int | None = None,
    company_id: int | None = None,
    provider: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """Cree une transaction en base."""

    if montant is None:
        tarif = TARIFS.get(type, {})
        montant = tarif.get("prix", 0)

    reference = generate_reference()

    payload = {
        "user_id": user_id,
        "company_id": company_id,
        "type": type,
        "reference": reference,
        "montant": montant,
        "devise": "XOF",
        "statut": "pending",
        "provider": provider or PAYMENT_PROVIDER,
        "metadata": metadata or {},
    }

    try:
        r = supabase.table(TABLE).insert(payload).execute()
        transaction = r.data[0] if r.data else {}
        logger.info(f"Transaction creee : {reference} - {montant} FCFA")
        return transaction
    except Exception as e:
        logger.error(f"Erreur creation transaction : {e}")
        return {}


def confirm_transaction(
    reference: str,
    provider_transaction_id: str | None = None,
) -> dict | None:
    """Marque une transaction comme payee."""

    try:
        payload = {
            "statut": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }

        if provider_transaction_id:
            payload["provider_transaction_id"] = provider_transaction_id

        r = (
            supabase.table(TABLE)
            .update(payload)
            .eq("reference", reference)
            .execute()
        )

        transaction = r.data[0] if r.data else None

        if transaction:
            logger.info(f"Transaction confirmee : {reference}")
            _apply_benefits(transaction)

        return transaction
    except Exception as e:
        logger.error(f"Erreur confirmation : {e}")
        return None


def _apply_benefits(transaction: dict):
    """Applique les benefices selon le type de transaction."""

    type_tx = transaction.get("type")
    metadata = transaction.get("metadata") or {}

    try:
        if type_tx == "premium_job":
            job_id = metadata.get("job_id")
            if job_id:
                from app.services.premium_service import activate_premium
                activate_premium(job_id, transaction["user_id"])

        elif type_tx == "sponsored_job":
            job_id = metadata.get("job_id")
            if job_id:
                from app.services.sponsored_service import activate_sponsored
                activate_sponsored(job_id, transaction.get("company_id"))

        elif type_tx == "subscription_premium":
            from app.services.premium_service import activate_subscription
            activate_subscription(transaction["user_id"], "premium")

        elif type_tx == "subscription_pro":
            from app.services.premium_service import activate_subscription
            activate_subscription(transaction["user_id"], "pro")

        elif type_tx == "banner_week":
            from app.services.sponsored_service import activate_banner
            banner_id = metadata.get("banner_id")
            if banner_id:
                activate_banner(banner_id)
    except Exception as e:
        logger.error(f"Erreur application benefices : {e}")


def get_user_transactions(user_id: str) -> list[dict]:
    """Transactions d'un utilisateur."""

    try:
        r = (
            supabase.table(TABLE)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return r.data or []
    except Exception as e:
        logger.error(f"Erreur lecture transactions : {e}")
        return []


def get_revenue_stats() -> dict:
    """Statistiques de revenus (admin)."""

    try:
        r = (
            supabase.table(TABLE)
            .select("montant, type, statut")
            .eq("statut", "paid")
            .execute()
        )

        rows = r.data or []
        total = sum(row.get("montant", 0) for row in rows)

        par_type = {}
        for row in rows:
            t = row.get("type", "other")
            par_type[t] = par_type.get(t, 0) + row.get("montant", 0)

        return {
            "total_fcfa": total,
            "total_transactions": len(rows),
            "par_type": par_type,
        }
    except Exception as e:
        logger.error(f"Erreur stats revenus : {e}")
        return {"total_fcfa": 0, "total_transactions": 0, "par_type": {}}
`;

// ==================== Backend : services/premium_service.py ====================

const PREMIUM_SERVICE = `"""
Service des offres premium et abonnements candidats.
"""

from datetime import datetime, timezone, timedelta

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.core.payments import TARIFS


logger = get_logger(__name__)

TABLE_JOBS = "jobs"
TABLE_SUBS = "subscriptions"


def activate_premium(job_id: int, user_id: str | None = None) -> dict | None:
    """Active le statut premium sur une offre pour 30 jours."""

    until = datetime.now(timezone.utc) + timedelta(days=30)

    payload = {
        "is_premium": True,
        "premium_until": until.isoformat(),
        "boost_score": 50,
    }

    try:
        r = (
            supabase.table(TABLE_JOBS)
            .update(payload)
            .eq("id", job_id)
            .execute()
        )
        logger.info(f"Offre #{job_id} passee en premium")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur activation premium : {e}")
        return None


def deactivate_expired_premium() -> int:
    """Desactive les offres premium expirees."""

    now = datetime.now(timezone.utc).isoformat()

    try:
        r = (
            supabase.table(TABLE_JOBS)
            .update({"is_premium": False, "boost_score": 0})
            .lt("premium_until", now)
            .eq("is_premium", True)
            .execute()
        )
        count = len(r.data or [])
        if count:
            logger.info(f"{count} offre(s) premium expiree(s)")
        return count
    except Exception as e:
        logger.error(f"Erreur desactivation premium : {e}")
        return 0


def activate_subscription(user_id: str, plan: str = "premium") -> dict | None:
    """Active un abonnement pour un utilisateur."""

    tarif = TARIFS.get(f"subscription_{plan}", {})
    duree = tarif.get("duree_jours", 30)

    fin = datetime.now(timezone.utc) + timedelta(days=duree)

    try:
        supabase.table(TABLE_SUBS).update({
            "statut": "expired",
        }).eq("user_id", user_id).eq("statut", "active").execute()
    except Exception:
        pass

    payload = {
        "user_id": user_id,
        "plan": plan,
        "statut": "active",
        "montant": tarif.get("prix", 0),
        "debut_at": datetime.now(timezone.utc).isoformat(),
        "fin_at": fin.isoformat(),
    }

    try:
        r = supabase.table(TABLE_SUBS).insert(payload).execute()
        logger.info(f"Abonnement {plan} active pour {user_id}")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur activation abonnement : {e}")
        return None


def get_user_subscription(user_id: str) -> dict | None:
    """Retourne l'abonnement actif d'un utilisateur."""

    try:
        r = (
            supabase.table(TABLE_SUBS)
            .select("*")
            .eq("user_id", user_id)
            .eq("statut", "active")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur lecture abonnement : {e}")
        return None


def is_premium_user(user_id: str) -> bool:
    """Verifie si un utilisateur a un abonnement actif."""

    sub = get_user_subscription(user_id)
    if not sub:
        return False

    fin = sub.get("fin_at")
    if not fin:
        return False

    try:
        fin_dt = datetime.fromisoformat(fin.replace("Z", "+00:00"))
        return fin_dt > datetime.now(timezone.utc)
    except Exception:
        return False
`;

// ==================== Backend : services/sponsored_service.py ====================

const SPONSORED_SERVICE = `"""
Service des offres sponsorisees et bannieres publicitaires.
"""

from datetime import datetime, timezone, timedelta

from app.core.supabase import supabase
from app.core.logger import get_logger


logger = get_logger(__name__)

TABLE_JOBS = "jobs"
TABLE_BANNERS = "banners"


def activate_sponsored(job_id: int, company_id: int | None = None) -> dict | None:
    """Active le statut sponsorise sur une offre pour 30 jours."""

    until = datetime.now(timezone.utc) + timedelta(days=30)

    payload = {
        "is_sponsored": True,
        "sponsor_company_id": company_id,
        "premium_until": until.isoformat(),
        "boost_score": 100,
    }

    try:
        r = (
            supabase.table(TABLE_JOBS)
            .update(payload)
            .eq("id", job_id)
            .execute()
        )
        logger.info(f"Offre #{job_id} sponsorisee")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur activation sponsored : {e}")
        return None


def deactivate_expired_sponsored() -> int:
    """Desactive les offres sponsorisees expirees."""

    now = datetime.now(timezone.utc).isoformat()

    try:
        r = (
            supabase.table(TABLE_JOBS)
            .update({"is_sponsored": False, "boost_score": 0})
            .lt("premium_until", now)
            .eq("is_sponsored", True)
            .execute()
        )
        count = len(r.data or [])
        if count:
            logger.info(f"{count} offre(s) sponsorisee(s) expiree(s)")
        return count
    except Exception as e:
        logger.error(f"Erreur desactivation sponsored : {e}")
        return 0


def create_banner(
    company_id: int,
    titre: str,
    image_url: str,
    lien_url: str,
    placement: str = "home_top",
    duree_jours: int = 7,
    montant: int | None = None,
) -> dict | None:
    """Cree une banniere publicitaire."""

    fin = datetime.now(timezone.utc) + timedelta(days=duree_jours)

    payload = {
        "company_id": company_id,
        "titre": titre,
        "image_url": image_url,
        "lien_url": lien_url,
        "placement": placement,
        "actif": False,
        "fin_at": fin.isoformat(),
        "montant": montant,
    }

    try:
        r = supabase.table(TABLE_BANNERS).insert(payload).execute()
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur creation banniere : {e}")
        return None


def activate_banner(banner_id: int) -> dict | None:
    """Active une banniere apres paiement."""

    try:
        r = (
            supabase.table(TABLE_BANNERS)
            .update({"actif": True})
            .eq("id", banner_id)
            .execute()
        )
        logger.info(f"Banniere #{banner_id} activee")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur activation banniere : {e}")
        return None


def get_active_banners(placement: str) -> list[dict]:
    """Retourne les bannieres actives pour un emplacement."""

    now = datetime.now(timezone.utc).isoformat()

    try:
        r = (
            supabase.table(TABLE_BANNERS)
            .select("*")
            .eq("placement", placement)
            .eq("actif", True)
            .or_(f"fin_at.is.null,fin_at.gt.{now}")
            .execute()
        )
        return r.data or []
    except Exception as e:
        logger.error(f"Erreur lecture bannieres : {e}")
        return []
`;

// ==================== Backend : api/payments.py ====================

const PAYMENTS_API = `"""
Routes API pour les paiements.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.payments import TARIFS, MOYENS_PAR_PAYS, PAYMENT_PROVIDER
from app.services.payment_service import (
    create_transaction,
    get_user_transactions,
    get_revenue_stats,
)


router = APIRouter(prefix="/payments", tags=["payments"])


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
    type: str,
    metadata: dict | None = None,
    user=Depends(get_current_user),
):
    """Cree une transaction en attente."""

    if type not in TARIFS:
        raise HTTPException(400, f"Type de paiement inconnu : {type}")

    transaction = create_transaction(
        user_id=user["id"],
        type=type,
        metadata=metadata or {},
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
        "devise": transaction["devise"],
        "provider": transaction["provider"],
        "statut": transaction["statut"],
    }


@router.get("/transactions")
def my_transactions(user=Depends(get_current_user)):
    return get_user_transactions(user["id"])


@router.get("/admin/revenue")
def revenue(user=Depends(get_current_user)):
    if user.get("user_role") != "admin":
        raise HTTPException(403, "Admin requis")
    return get_revenue_stats()
`;

// ==================== Backend : api/premium.py ====================

const PREMIUM_API = `"""
Routes API pour les offres premium.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.services.payment_service import create_transaction
from app.services.premium_service import is_premium_user


router = APIRouter(prefix="/premium", tags=["premium"])


@router.get("/status")
def status(user=Depends(get_current_user)):
    """Statut premium de l'utilisateur."""
    return {"is_premium": is_premium_user(user["id"])}


@router.post("/jobs/{job_id}/boost")
def boost_job(job_id: int, user=Depends(get_current_user)):
    """Met en avant une offre (premium)."""

    transaction = create_transaction(
        user_id=user["id"],
        type="premium_job",
        metadata={"job_id": job_id},
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
        "message": "Transaction creee - en attente de paiement",
    }
`;

// ==================== Backend : api/sponsored.py ====================

const SPONSORED_API = `"""
Routes API pour les offres sponsorisees.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.services.payment_service import create_transaction
from app.services.sponsored_service import (
    create_banner,
    get_active_banners,
)


router = APIRouter(prefix="/sponsored", tags=["sponsored"])


@router.get("/banners/{placement}")
def banners(placement: str):
    """Bannieres actives pour un emplacement."""
    return get_active_banners(placement)


@router.post("/banners")
def create_banner_endpoint(
    company_id: int,
    titre: str,
    image_url: str,
    lien_url: str,
    placement: str = "home_top",
    user=Depends(get_current_user),
):
    """Cree une banniere (en attente de paiement)."""

    if user.get("user_role") != "admin":
        raise HTTPException(403, "Admin requis")

    banner = create_banner(
        company_id=company_id,
        titre=titre,
        image_url=image_url,
        lien_url=lien_url,
        placement=placement,
    )

    if not banner:
        raise HTTPException(500, "Impossible de creer la banniere")

    transaction = create_transaction(
        user_id=user["id"],
        type="banner_week",
        company_id=company_id,
        metadata={"banner_id": banner["id"]},
    )

    return {"banner": banner, "transaction": transaction}


@router.post("/jobs/{job_id}")
def sponsor_job(
    job_id: int,
    company_id: int,
    user=Depends(get_current_user),
):
    """Sponsorise une offre."""

    transaction = create_transaction(
        user_id=user["id"],
        company_id=company_id,
        type="sponsored_job",
        metadata={"job_id": job_id},
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
    }
`;

// ==================== Frontend : services/payment.js ====================

const PAYMENT_SERVICE_JS = `/**
 * Service de paiement.
 */

import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

export default {
  getTarifs: () => api.get("/payments/tarifs").then((r) => r.data),
  initiate: (type, metadata = {}) =>
    api.post("/payments/initiate", { type, metadata }).then((r) => r.data),
  getTransactions: () => api.get("/payments/transactions").then((r) => r.data),
  getPremiumStatus: () => api.get("/premium/status").then((r) => r.data),
  boostJob: (jobId) => api.post(\`/premium/jobs/\${jobId}/boost\`).then((r) => r.data),
  getBanners: (placement) =>
    api.get(\`/sponsored/banners/\${placement}\`).then((r) => r.data),
};
`;

// ==================== Frontend : PremiumBadge.vue ====================

const PREMIUM_BADGE = `<script setup>
defineProps({
  size: { type: String, default: "sm" },
});

const sizes = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-md font-semibold',
      'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm',
      sizes[size],
    ]"
  >
    ⭐ Premium
  </span>
</template>
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/core/payments.py": PAYMENTS_CONFIG,
  "backend/app/services/payment_service.py": PAYMENT_SERVICE,
  "backend/app/services/premium_service.py": PREMIUM_SERVICE,
  "backend/app/services/sponsored_service.py": SPONSORED_SERVICE,
  "backend/app/api/payments.py": PAYMENTS_API,
  "backend/app/api/premium.py": PREMIUM_API,
  "backend/app/api/sponsored.py": SPONSORED_API,
  "frontend/src/services/payment.js": PAYMENT_SERVICE_JS,
  "frontend/src/components/monetization/PremiumBadge.vue": PREMIUM_BADGE,
};

// ==================== Patch de main.py ====================

function patchMainPy() {
  const mainPath = "backend/app/main.py";
  const fullPath = path.join(ROOT, mainPath);

  if (!fs.existsSync(fullPath)) {
    log.error(`Fichier ${mainPath} introuvable`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");

  if (content.includes("payments")) {
    log.info("main.py deja patche (payments present)");
    return true;
  }

  // Backup
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(ROOT, "_backups", timestamp, "backend", "app");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(fullPath, path.join(backupDir, "main.py"));
  } catch (e) {
    log.warn(`Backup impossible : ${e.message}`);
  }

  // Ajout des imports
  if (content.includes("    push,") && !content.includes("    payments,")) {
    content = content.replace(
      /(\s+)push,/,
      "$1push,$1payments,$1premium,$1sponsored,"
    );
  }

  // Ajout des routers
  if (!content.includes("app.include_router(payments.router)")) {
    content = content.replace(
      /app\.include_router\(push\.router\)/,
      `app.include_router(push.router)
app.include_router(payments.router)
app.include_router(premium.router)
app.include_router(sponsored.router)`
    );
  }

  if (!OPTIONS.dryRun) {
    fs.writeFileSync(fullPath, content, "utf8");
  }

  log.file(mainPath + " (patché)", "overwritten");
  return true;
}

// ==================== Main ====================

async function main() {
  log.banner("MODULE 14 — MONÉTISATION");

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

  log.section(`Creation de ${Object.keys(FILES).length} fichiers`);

  const results = writeFiles(FILES, {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  });

  for (const d of results.details) {
    log.file(d.path, d.status);
  }

  log.info(
    `-> ${results.created} cree(s), ${results.overwritten} ecrase(s), ${results.skipped} ignore(s)`
  );

  log.section("Patch de main.py");
  patchMainPy();

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesCreated: results.created,
    });
  }

  log.banner("MODULE 14 — TERMINE");

  console.log("");
  console.log("  Fichiers crees :", results.created);
  console.log("");
  console.log("  IMPORTANT : Verifier main.py");
  console.log("  ------------------------------");
  console.log("  Select-String -Path backend\\app\\main.py -Pattern 'payments|premium|sponsored'");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Verifier main.py (pas de doubles virgules)");
  console.log("  2. Redemarrer Uvicorn");
  console.log("  3. Tester : GET /payments/tarifs");
  console.log("  4. Tester : GET /premium/status (avec auth)");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});