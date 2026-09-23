"""
Service des offres sponsorisees et bannieres publicitaires.
"""

from datetime import UTC, datetime, timedelta

from app.core.logger import get_logger
from app.core.supabase import supabase

logger = get_logger(__name__)

TABLE_JOBS = "jobs"
TABLE_BANNERS = "banners"


def activate_sponsored(job_id: int, company_id: int | None = None) -> dict | None:
    """Active le statut sponsorise sur une offre pour 30 jours."""

    until = datetime.now(UTC) + timedelta(days=30)

    payload = {
        "is_sponsored": True,
        "sponsor_company_id": company_id,
        "premium_until": until.isoformat(),
        "boost_score": 100,
    }

    try:
        r = supabase.table(TABLE_JOBS).update(payload).eq("id", job_id).execute()
        logger.info(f"Offre #{job_id} sponsorisee")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur activation sponsored : {e}")
        return None


def deactivate_expired_sponsored() -> int:
    """Desactive les offres sponsorisees expirees."""

    now = datetime.now(UTC).isoformat()

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

    fin = datetime.now(UTC) + timedelta(days=duree_jours)

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
        r = supabase.table(TABLE_BANNERS).update({"actif": True}).eq("id", banner_id).execute()
        logger.info(f"Banniere #{banner_id} activee")
        return r.data[0] if r.data else None
    except Exception as e:
        logger.error(f"Erreur activation banniere : {e}")
        return None


def get_active_banners(placement: str) -> list[dict]:
    """Retourne les bannieres actives pour un emplacement."""

    now = datetime.now(UTC).isoformat()

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
