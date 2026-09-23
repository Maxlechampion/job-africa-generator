"""
Service de partage : tracking + generation Open Graph.
"""

import hashlib
import urllib.parse

from app.core.supabase import supabase
from app.core.logger import get_logger


logger = get_logger(__name__)

TABLE = "shares"

CANAUX_VALIDES = {
    "whatsapp", "linkedin", "facebook", "twitter",
    "telegram", "email", "copy", "native", "other",
}

FRONTEND_URL = "https://frontend-zeta-six-12mzm0ovel.vercel.app"


def _hash_ip(ip: str | None) -> str | None:
    """Hash RGPD-compatible de l'IP."""
    if not ip:
        return None
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def record_share(
    job_id: int,
    canal: str,
    user_id: str | None = None,
    user_agent: str | None = None,
    referrer: str | None = None,
    ip: str | None = None,
) -> dict:
    """Enregistre un partage."""

    if canal not in CANAUX_VALIDES:
        canal = "other"

    payload = {
        "job_id": job_id,
        "canal": canal,
        "user_id": user_id,
        "user_agent": (user_agent or "")[:500],
        "referrer": (referrer or "")[:500],
        "ip_hash": _hash_ip(ip),
    }

    try:
        r = supabase.table(TABLE).insert(payload).execute()
        return r.data[0] if r.data else {}
    except Exception as e:
        logger.error(f"Erreur tracking partage : {e}")
        return {}


def get_job_share_stats(job_id: int) -> dict:
    """Retourne les statistiques de partage d'une offre."""

    try:
        r = (
            supabase.table(TABLE)
            .select("canal")
            .eq("job_id", job_id)
            .execute()
        )

        rows = r.data or []

        counts = {c: 0 for c in CANAUX_VALIDES}
        for row in rows:
            c = row.get("canal", "other")
            counts[c] = counts.get(c, 0) + 1

        return {
            "job_id": job_id,
            "total_partages": len(rows),
            "whatsapp": counts.get("whatsapp", 0),
            "linkedin": counts.get("linkedin", 0),
            "facebook": counts.get("facebook", 0),
            "copies": counts.get("copy", 0),
        }
    except Exception as e:
        logger.error(f"Erreur stats partage : {e}")
        return {
            "job_id": job_id,
            "total_partages": 0,
            "whatsapp": 0,
            "linkedin": 0,
            "facebook": 0,
            "copies": 0,
        }


def build_share_urls(job: dict) -> dict:
    """Construit les URLs de partage pour chaque canal."""

    job_id = job.get("id")
    titre = job.get("titre", "Offre d'emploi")
    entreprise = job.get("entreprise", "")
    pays = job.get("pays", "")
    ville = job.get("ville", "")

    url = f"{FRONTEND_URL}/jobs/{job_id}"

    localisation = " · ".join(filter(None, [ville, pays]))

    message = (
        f"🌍 *{titre}*\n"
        f"{entreprise}\n"
        f"📍 {localisation}\n\n"
        f"👉 Voir l'offre sur Job Africa :\n{url}"
    )

    message_linkedin = f"{titre} — {entreprise} · {localisation}"

    url_enc = urllib.parse.quote(url)
    message_enc = urllib.parse.quote(message)
    message_li_enc = urllib.parse.quote(message_linkedin)

    return {
        "url": url,
        "message": message,
        "message_linkedin": message_linkedin,
        "whatsapp": f"https://wa.me/?text={message_enc}",
        "linkedin": f"https://www.linkedin.com/sharing/share-offsite/?url={url_enc}",
        "facebook": f"https://www.facebook.com/sharer/sharer.php?u={url_enc}",
        "twitter": f"https://twitter.com/intent/tweet?text={message_li_enc}&url={url_enc}",
        "telegram": f"https://t.me/share/url?url={url_enc}&text={message_li_enc}",
        "email": f"mailto:?subject={urllib.parse.quote(titre)}&body={message_enc}",
    }


def build_og_data(job: dict, lang: str = "fr") -> dict:
    """Construit les donnees Open Graph pour une offre."""

    titre = job.get("titre", "Offre d'emploi")
    entreprise = job.get("entreprise", "")
    pays = job.get("pays", "")
    ville = job.get("ville", "")
    description = job.get("description") or ""
    resume = job.get("resume_ia") or description

    if len(resume) > 160:
        resume = resume[:157] + "..."

    localisation = " · ".join(filter(None, [ville, pays]))

    og_title = f"{titre} — {entreprise}" if entreprise else titre
    og_description = f"📍 {localisation}\n\n{resume}" if localisation else resume

    return {
        "title": og_title,
        "description": og_description,
        "url": f"{FRONTEND_URL}/jobs/{job.get('id')}",
        "image": f"{FRONTEND_URL}/og/job/{job.get('id')}.png",
        "site_name": "Job Africa",
        "locale": "fr_FR" if lang == "fr" else "en_US",
    }
