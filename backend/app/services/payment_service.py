"""
Service de paiement abstrait.
"""

import uuid
from datetime import UTC, datetime, timezone 

from app.core.logger import get_logger
from app.core.payments import PAYMENT_PROVIDER, TARIFS
from app.core.supabase import supabase

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
    access_token: str | None = None,  # ← NOUVEAU
) -> dict:
    """Cree une transaction en base."""

    # Choisit le client (authentifié si token fourni)
    if access_token:
        from app.core.supabase import get_authenticated_client
        client = get_authenticated_client(access_token)
    else:
        client = supabase

    # ... reste du code (utilise "client" au lieu de "supabase")
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

    Args:
        reference: Reference unique de la transaction
        provider_transaction_id: ID du provider (optionnel)
        use_admin: Si True, utilise le client service_role (bypass RLS)
    """

    # Choisit le client
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
        r = supabase.table(TABLE).select("montant, type, statut").eq("statut", "paid").execute()

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
