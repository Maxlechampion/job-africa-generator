"""
Routes API admin pour tester les sources.

Permet de tester une source sans l'ajouter définitivement.
"""

from fastapi import APIRouter, HTTPException, Query

from app.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/admin/sources", tags=["admin-sources"])


# ==================== REGISTRE DE TESTS ====================

def _get_testable_sources() -> dict:
    """Retourne les sources testables (nom → classe)."""
    sources = {}
    try:
        from app.collectors.scrapers.sources.benin_digital import BeninDigitalScraper
        sources["benin-digital"] = BeninDigitalScraper
    except ImportError:
        pass
    
    try:
        from app.collectors.scrapers.sources.emploibenin import EmploibeninScraper
        sources["emploibenin"] = EmploibeninScraper
    except ImportError:
        pass

    try:
        from app.collectors.sources.benin_rss import LaTempeteBeninRSS, BeninNewsRSS
        sources["la-tempete"] = LaTempeteBeninRSS
        sources["benin-news"] = BeninNewsRSS
    except ImportError:
        pass
    try:
        from app.collectors.scrapers.sources.jobberman import JobbermanScraper
        sources["jobberman"] = JobbermanScraper
    except ImportError:
        pass

    try:
        from app.collectors.scrapers.sources.emploirapide import EmploiRapideScraper
        sources["emploirapide"] = EmploiRapideScraper
    except ImportError:
        pass

    try:
        from app.collectors.sources.fuzu import FuzuCollector
        sources["fuzu"] = FuzuCollector
    except ImportError:
        pass
    try:
        from app.collectors.ats.lever import LeverCollector
        sources["lever"] = LeverCollector
    except ImportError:
        pass



    return sources


@router.get("/test", summary="Tester une source individuellement")
def test_source(
    source: str = Query(..., description="Nom de la source (emploibenin, benin-digital, la-tempete, benin-news)"),
    limit: int = Query(5, ge=1, le=50, description="Nombre max d'offres à retourner"),
):
    """
    Teste une source individuellement sans l'insérer en base.

    Utile pour vérifier qu'un scraper fonctionne avant de l'activer.
    """
    sources = _get_testable_sources()

    if source not in sources:
        raise HTTPException(
            404,
            f"Source inconnue : {source}. Disponibles : {list(sources.keys())}",
        )

    CollectorClass = sources[source]
    collector = CollectorClass()

    try:
        jobs = collector.collect()
        return {
            "source": source,
            "status": "success",
            "total_collected": len(jobs),
            "sample": jobs[:limit],
        }
    except Exception as e:
        logger.error(f"Erreur test source {source} : {e}")
        return {
            "source": source,
            "status": "error",
            "error": str(e)[:500],
        }


@router.get("/list", summary="Lister les sources testables")
def list_testable():
    """Liste les sources disponibles pour test."""
    return {
        "sources": list(_get_testable_sources().keys()),
    }
