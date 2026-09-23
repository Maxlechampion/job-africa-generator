"""
Registre des entreprises africaines utilisant Greenhouse ou Ashby.

Ces entreprises publient leurs offres via des APIs publiques,
sans cle ni authentification.

Verifier regulierement que les tokens sont toujours valides.

Derniere mise a jour : 2026-09-17
Total : 7 sources ATS actives
"""

from app.collectors.ats.ashby import AshbyCollector
from app.collectors.ats.greenhouse import GreenhouseCollector

# ==================== Greenhouse ====================


class MoniepointGreenhouse(GreenhouseCollector):
    """
    Moniepoint - Fintech nigeriane (Lagos).

    Volume : ~190 offres
    API : https://boards-api.greenhouse.io/v1/boards/moniepoint/jobs
    """

    def __init__(self):
        super().__init__(
            token="moniepoint",
            source_name="Moniepoint",
            country="Nigeria",
        )


class JumiaGreenhouse(GreenhouseCollector):
    """
    Jumia - E-commerce panafricain.

    Volume : ~20 offres
    API : https://boards-api.greenhouse.io/v1/boards/jumia/jobs
    """

    def __init__(self):
        super().__init__(
            token="jumia",
            source_name="Jumia",
        )


class CarbonGreenhouse(GreenhouseCollector):
    """
    Carbon (ex-OneFi) - Fintech credit nigeriane.

    Volume : ~13 offres
    API : https://boards-api.greenhouse.io/v1/boards/carbon/jobs
    """

    def __init__(self):
        super().__init__(
            token="carbon",
            source_name="Carbon",
            country="Nigeria",
        )


# ==================== Ashby ====================


class AndelaAshby(AshbyCollector):
    """
    Andela - Talent marketplace africain.

    Volume : ~17 offres
    API : https://api.ashbyhq.com/posting-api/job-board/andela
    """

    def __init__(self):
        super().__init__(
            board_name="andela",
            source_name="Andela",
        )


class MKOPAAshby(AshbyCollector):
    """
    M-KOPA - Energie solaire pay-as-you-go.

    Present au Kenya, Ouganda, Nigeria, Ghana.
    Volume : ~43 offres
    API : https://api.ashbyhq.com/posting-api/job-board/m-kopa
    """

    def __init__(self):
        super().__init__(
            board_name="m-kopa",
            source_name="M-KOPA",
        )


class LemfiAshby(AshbyCollector):
    """
    LemFi (ex-Lemonade Finance) - Fintech transfert d'argent.

    Present au Nigeria, Kenya, UK, Canada.
    Volume : ~21 offres
    API : https://api.ashbyhq.com/posting-api/job-board/lemfi
    """

    def __init__(self):
        super().__init__(
            board_name="lemfi",
            source_name="LemFi",
        )


class SabiAshby(AshbyCollector):
    """
    Sabi - B2B e-commerce (Afrique).

    Present au Nigeria, Kenya, Ghana.
    Volume : ~9 offres
    API : https://api.ashbyhq.com/posting-api/job-board/sabi
    """

    def __init__(self):
        super().__init__(
            board_name="sabi",
            source_name="Sabi",
        )


# ==================== Registre ====================

ALL_ATS_SOURCES = [
    # Greenhouse
    MoniepointGreenhouse,
    JumiaGreenhouse,
    CarbonGreenhouse,
    # Ashby
    AndelaAshby,
    MKOPAAshby,
    LemfiAshby,
    SabiAshby,
]


def get_ats_sources_summary() -> list[dict]:
    """Retourne un resume des sources ATS configurees."""
    summary = []

    for CollectorClass in ALL_ATS_SOURCES:
        try:
            collector = CollectorClass()
            summary.append(
                {
                    "name": collector.name,
                    "ats_type": collector.ats_type,
                    "country": getattr(collector, "country", None),
                    "api_url": getattr(collector, "api_url", None),
                    "status": "active",
                }
            )
        except Exception as e:
            summary.append(
                {
                    "name": CollectorClass.__name__,
                    "error": str(e),
                    "status": "error",
                }
            )

    return summary
