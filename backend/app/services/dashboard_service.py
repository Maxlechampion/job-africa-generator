"""
Service du dashboard admin.
"""

from datetime import UTC, datetime, timedelta

from app.core.logger import get_logger
from app.core.supabase import supabase

logger = get_logger(__name__)


def get_kpi() -> dict:
    """KPI principaux."""

    def count(table: str, **filters) -> int:
        q = supabase.table(table).select("id", count="exact")
        for k, v in filters.items():
            q = q.eq(k, v)
        r = q.execute()
        return r.count or 0

    now = datetime.now(UTC)

    r_7j = (
        supabase.table("jobs")
        .select("id", count="exact")
        .gte("created_at", (now - timedelta(days=7)).isoformat())
        .execute()
    )

    r_30j = (
        supabase.table("jobs")
        .select("id", count="exact")
        .gte("created_at", (now - timedelta(days=30)).isoformat())
        .execute()
    )

    return {
        "total_offres": count("jobs"),
        "total_sources": count("sources"),
        "total_sources_actives": count("sources", actif=True),
        "total_companies": count("companies"),
        "total_skills": count("skills"),
        "offres_7j": r_7j.count or 0,
        "offres_30j": r_30j.count or 0,
    }


def get_daily_counts(days: int = 30) -> list[dict]:
    """Offres par jour (30 derniers jours)."""

    since = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    r = supabase.table("jobs").select("created_at").gte("created_at", since).execute()

    counts: dict[str, int] = {}
    for row in r.data or []:
        created = row.get("created_at", "")
        if not created:
            continue
        day = created[:10]
        counts[day] = counts.get(day, 0) + 1

    result = []
    today = datetime.now(UTC).date()

    for i in range(days - 1, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        result.append({"jour": day, "total": counts.get(day, 0)})

    return result


def get_top_skills(limit: int = 15) -> list[dict]:
    """Top competences."""

    r = supabase.table("job_skills").select("skill_id, skills(nom, categorie)").execute()

    counts: dict[int, dict] = {}

    for row in r.data or []:
        skill = row.get("skills") or {}
        sid = row.get("skill_id")
        if not sid or not skill.get("nom"):
            continue

        if sid not in counts:
            counts[sid] = {
                "label": skill["nom"],
                "total": 0,
                "extra": skill.get("categorie"),
            }
        counts[sid]["total"] += 1

    return sorted(counts.values(), key=lambda x: x["total"], reverse=True)[:limit]


def get_top_pays(limit: int = 10) -> list[dict]:
    """Top pays."""

    r = supabase.table("jobs").select("pays").execute()

    counts: dict[str, int] = {}
    for row in r.data or []:
        p = row.get("pays")
        if p:
            counts[p] = counts.get(p, 0) + 1

    return sorted(
        [{"label": k, "total": v} for k, v in counts.items()],
        key=lambda x: x["total"],
        reverse=True,
    )[:limit]


def get_sources_status() -> list[dict]:
    """Statut des sources."""

    r = supabase.table("sources").select("*").order("nom").execute()

    return [
        {
            "id": s["id"],
            "nom": s["nom"],
            "type": s["type"],
            "actif": s.get("actif", True),
            "derniere_collecte": s.get("derniere_collecte"),
            "dernier_statut": s.get("dernier_statut"),
            "nombre_offres_total": s.get("nombre_offres_total", 0),
        }
        for s in r.data or []
    ]


def get_recent_logs(limit: int = 20) -> list[dict]:
    """Derniers logs."""

    r = (
        supabase.table("collect_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return r.data or []


def get_dashboard() -> dict:
    """Dashboard complet."""

    return {
        "kpi": get_kpi(),
        "daily": get_daily_counts(30),
        "top_skills": get_top_skills(15),
        "top_pays": get_top_pays(10),
        "sources": get_sources_status(),
        "logs": get_recent_logs(20),
    }
