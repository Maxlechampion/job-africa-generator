"""
Registre des sources API.

Sources actives :
    - ProGigFinder (✅ verifie)
    - Fuzu (🟡 necessite proxy)

Pour desactiver une source temporairement :
commenter sa ligne dans ALL_API_SOURCES.
"""

from app.collectors.api.progigfinder import ProGigFinderCollector
from app.collectors.api.fuzu import FuzuCollector


ALL_API_SOURCES = [
    ProGigFinderCollector,
    # FuzuCollector,
]


def get_api_sources_summary() -> list[dict]:
    """Retourne un resume des sources API configurees."""
    summary = []

    for CollectorClass in ALL_API_SOURCES:
        try:
            collector = CollectorClass()
            summary.append({
                "name": collector.name,
                "api_url": collector.api_url,
                "country": getattr(collector, "country", None),
                "type": "api",
                "status": "active",
            })
        except Exception as e:
            summary.append({
                "name": CollectorClass.__name__,
                "error": str(e),
                "status": "error",
            })

    return summary
