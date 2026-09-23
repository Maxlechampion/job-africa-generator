"""
Service d'envoi de notifications push.

Base sur pywebpush.
"""

from datetime import datetime, timezone

from pywebpush import webpush, WebPushException

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.core.push import (
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    VAPID_SUBJECT,
    DEFAULT_TTL,
    DEFAULT_URGENCY,
)


logger = get_logger(__name__)

TABLE = "push_subscriptions"


# ==================== Enregistrement ====================
def save_subscription(
    user_id: str,
    subscription: dict,
    user_agent: str | None = None,
) -> dict | None:
    """Enregistre ou met a jour une souscription push."""

    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")

    if not endpoint or not p256dh or not auth:
        logger.warning("Souscription invalide : endpoint ou cles manquants")
        return None

    payload = {
        "user_id": user_id,
        "endpoint": endpoint,
        "p256dh": p256dh,
        "auth": auth,
        "user_agent": (user_agent or "")[:500],
    }

    try:
        r = (
            supabase.table(TABLE)
            .upsert(payload, on_conflict="endpoint")
            .execute()
        )
        logger.info(f"Souscription push enregistree pour {user_id}")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur enregistrement souscription : {e}")
        return None


def delete_subscription(endpoint: str):
    """Supprime une souscription."""

    try:
        supabase.table(TABLE).delete().eq("endpoint", endpoint).execute()
        logger.info(f"Souscription supprimee : {endpoint[:40]}...")
    except Exception as e:
        logger.error(f"Erreur suppression souscription : {e}")


def get_user_subscriptions(user_id: str) -> list[dict]:
    """Retourne toutes les souscriptions d'un utilisateur."""

    try:
        r = (
            supabase.table(TABLE)
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return r.data or []
    except Exception as e:
        logger.error(f"Erreur lecture souscriptions : {e}")
        return []


# ==================== Envoi ====================
def _build_subscription_info(sub: dict) -> dict:
    """Construit l'objet subscription_info pour pywebpush."""

    return {
        "endpoint": sub["endpoint"],
        "keys": {
            "p256dh": sub["p256dh"],
            "auth": sub["auth"],
        },
    }


def send_push_to_subscription(
    sub: dict,
    payload: dict,
    ttl: int = DEFAULT_TTL,
    urgency: str = DEFAULT_URGENCY,
) -> bool:
    """Envoie une notification a une souscription."""

    if not VAPID_PRIVATE_KEY:
        logger.error("VAPID_PRIVATE_KEY manquante")
        return False

    try:
        webpush(
            subscription_info=_build_subscription_info(sub),
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=ttl,
            urgency=urgency,
        )
        return True
    except WebPushException as e:
        status = None
        if e.response is not None:
            status = e.response.status_code

        if status in (404, 410):
            logger.warning(f"Souscription expiree, suppression : {sub['endpoint'][:40]}...")
            delete_subscription(sub["endpoint"])
        else:
            logger.error(f"Erreur push : {e}")
        return False
    except Exception as e:
        logger.error(f"Erreur push inattendue : {e}")
        return False


def send_push_to_user(
    user_id: str,
    title: str,
    body: str,
    url: str | None = None,
    icon: str | None = None,
    tag: str | None = None,
) -> dict:
    """Envoie une notification push a toutes les souscriptions d'un utilisateur."""

    subs = get_user_subscriptions(user_id)

    if not subs:
        return {"sent": 0, "failed": 0}

    payload = {
        "title": title,
        "body": body,
        "url": url or "https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs",
        "icon": icon or "/icons/pwa-192x192.png",
        "tag": tag or "job-africa",
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    }

    sent = 0
    failed = 0

    for sub in subs:
        if send_push_to_subscription(sub, payload):
            sent += 1
        else:
            failed += 1

    logger.info(f"Push envoye a {user_id} : {sent} succes, {failed} echecs")

    return {"sent": sent, "failed": failed}


# ==================== Integration alertes ====================
def send_alert_push(alert: dict, jobs: list[dict]) -> dict:
    """Envoie une notification push pour une alerte."""

    user_id = alert.get("user_id")
    alert_nom = alert.get("nom", "Alerte Job Africa")
    count = len(jobs)

    if count == 0:
        return {"sent": 0, "failed": 0}

    title = f"🔔 {count} nouvelle{'s' if count > 1 else ''} offre{'s' if count > 1 else ''}"

    first_job = jobs[0]
    body = f"{alert_nom} — {first_job.get('titre', '')}"

    if first_job.get("entreprise"):
        body += f" chez {first_job['entreprise']}"

    url = f"https://frontend-zeta-six-12mzm0ovel.vercel.app/jobs/{first_job.get('id')}"

    return send_push_to_user(
        user_id=user_id,
        title=title,
        body=body,
        url=url,
        tag=f"alert-{alert.get('id')}",
    )
