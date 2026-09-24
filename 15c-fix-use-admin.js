#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 15c — FIX USE_ADMIN (service_role sur les endpoints)
 * ═══════════════════════════════════════════════════════════════
 *
 * Corrige le problème RLS en production :
 *   - Les endpoints /premium/*, /payments/*, /sponsored/* utilisaient
 *     le client anon (RLS bloquant) → 500 Internal Server Error
 *   - Correction : utiliser le client service_role (use_admin=True)
 *     pour bypasser RLS côté backend.
 *
 * FICHIERS MODIFIÉS (4) :
 *   backend/app/services/payment_service.py
 *   backend/app/api/premium.py
 *   backend/app/api/payments.py
 *   backend/app/api/sponsored.py
 *
 * USAGE :
 *   node 15c-fix-use-admin.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle
 *   --dry-run        Simule sans écrire
 *   --uninstall      Désinstalle
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

const MODULE_ID = "15c";
const MODULE_NAME = "Fix use_admin";
const MODULE_VERSION = "1.0.0";

const REQUIREMENTS = [
  "backend/app/services/payment_service.py",
  "backend/app/api/premium.py",
  "backend/app/api/payments.py",
  "backend/app/api/sponsored.py",
];

// ==================== payment_service.py (complet corrigé) ====================

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
    access_token: str | None = None,
    use_admin: bool = False,
) -> dict:
    """
    Cree une transaction en base.

    Args:
        user_id: ID de l'utilisateur (ou None)
        type: Type de transaction (premium_job, etc.)
        montant: Montant en FCFA (sinon lu depuis TARIFS)
        company_id: ID de l'entreprise (optionnel)
        provider: Provider de paiement (optionnel)
        metadata: Metadata JSON (ex: {"job_id": 1})
        access_token: JWT utilisateur (pour client authentifie)
        use_admin: Si True, utilise le client service_role (bypass RLS)
    """

    # ==================== CHOIX DU CLIENT ====================
    if use_admin:
        from app.core.supabase_admin import get_admin_client
        client = get_admin_client()
        if not client:
            logger.error("Client admin indisponible — fallback sur client anon")
            client = supabase
    elif access_token:
        from app.core.supabase import get_authenticated_client
        client = get_authenticated_client(access_token)
    else:
        client = supabase

    # ==================== MONTANT ====================
    if montant is None:
        tarif = TARIFS.get(type, {})
        montant = tarif.get("prix", 0)

    reference = generate_reference()

    # ==================== PAYLOAD ====================
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
        r = client.table(TABLE).insert(payload).execute()
        transaction = r.data[0] if r.data else {}
        logger.info(f"Transaction creee : {reference} - {montant} FCFA")
        return transaction
    except Exception as e:
        logger.error(f"Erreur creation transaction : {e}")
        return {}


def confirm_transaction(
    reference: str,
    provider_transaction_id: str | None = None,
    use_admin: bool = False,
) -> dict | None:
    """
    Marque une transaction comme payee.
    """

    if use_admin:
        from app.core.supabase_admin import get_admin_client
        client = get_admin_client()
        if not client:
            logger.error("Client admin indisponible")
            return None
    else:
        client = supabase

    try:
        payload = {
            "statut": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }

        if provider_transaction_id:
            payload["provider_transaction_id"] = provider_transaction_id

        r = (
            client.table(TABLE)
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

// ==================== premium.py (complet corrigé) ====================

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
    """
    Met en avant une offre (premium).

    Utilise use_admin=True pour bypasser RLS.
    """

    transaction = create_transaction(
        user_id=user["id"],
        type="premium_job",
        metadata={"job_id": job_id},
        use_admin=True,
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
        "message": "Transaction creee - en attente de paiement",
    }
`;

// ==================== payments.py (complet corrigé) ====================

const PAYMENTS_API = `"""
Routes API pour les paiements.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.payments import TARIFS, MOYENS_PAR_PAYS, PAYMENT_PROVIDER
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

    Utilise use_admin=True pour bypasser RLS.
    """

    if payload.type not in TARIFS:
        raise HTTPException(400, f"Type de paiement inconnu : {payload.type}")

    transaction = create_transaction(
        user_id=user["id"],
        type=payload.type,
        metadata=payload.metadata or {},
        use_admin=True,
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
    """Liste des transactions de l'utilisateur."""
    return get_user_transactions(user["id"])


@router.get("/admin/revenue")
def revenue(user=Depends(get_current_user)):
    """Statistiques de revenus (admin uniquement)."""
    if user.get("user_role") != "admin":
        raise HTTPException(403, "Admin requis")
    return get_revenue_stats()
`;

// ==================== sponsored.py (complet corrigé) ====================

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
        use_admin=True,
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
        use_admin=True,
    )

    if not transaction:
        raise HTTPException(500, "Impossible de creer la transaction")

    return {
        "reference": transaction["reference"],
        "montant": transaction["montant"],
    }
`;

// ==================== Fichiers ====================

const FILES = {
  "backend/app/services/payment_service.py": PAYMENT_SERVICE,
  "backend/app/api/premium.py": PREMIUM_API,
  "backend/app/api/payments.py": PAYMENTS_API,
  "backend/app/api/sponsored.py": SPONSORED_API,
};

// ==================== Main ====================

async function main() {
  log.banner("MODULE 15c — FIX USE_ADMIN (service_role)");

  if (!OPTIONS.uninstall && !validateRequirements(REQUIREMENTS, MODULE_NAME)) {
    process.exit(1);
  }

  if (!OPTIONS.uninstall && isInstalled(MODULE_ID) && !OPTIONS.force) {
    log.warn("Module deja installe.");
    log.info("Utilisez --force pour reinstaller, ou --uninstall pour supprimer.");
    process.exit(0);
  }

  if (OPTIONS.uninstall) {
    log.info("Ce module ne fait que modifier des fichiers existants.");
    log.info("Utilisez git pour revenir en arriere si necessaire.");
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
    "-> " + results.created + " cree(s), " + results.overwritten + " ecrase(s), " + results.skipped + " ignore(s)"
  );

  if (!OPTIONS.dryRun) {
    markInstalled(MODULE_ID, {
      version: MODULE_VERSION,
      files: Object.keys(FILES),
      filesOverwritten: results.overwritten,
      note: "Correction : use_admin=True sur les endpoints de monetisation",
    });
  }

  log.banner("MODULE 15c — TERMINE");

  console.log("");
  console.log("  Fichiers modifies :");
  console.log("  - payment_service.py (accepte use_admin)");
  console.log("  - premium.py (use_admin=True)");
  console.log("  - payments.py (use_admin=True)");
  console.log("  - sponsored.py (use_admin=True)");
  console.log("");
  console.log("  Prochaines etapes :");
  console.log("  1. Verifier la syntaxe :");
  console.log("     cd backend");
  console.log("     python -c \"from app.api.premium import router; print('OK')\"");
  console.log("");
  console.log("  2. Commit + push :");
  console.log("     cd ..");
  console.log("     git add .");
  console.log("     git commit -m 'fix: use_admin=True sur endpoints monetisation'");
  console.log("     git push origin main");
  console.log("");
  console.log("  3. Attendre le redeploiement Render (1-2 min)");
  console.log("");
  console.log("  4. Tester sur Vercel");
  console.log("");
}

main().catch((e) => {
  log.error(e.message);
  if (OPTIONS.verbose) console.error(e.stack);
  process.exit(1);
});