"""
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
