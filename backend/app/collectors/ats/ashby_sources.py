"""
Registre des entreprises africaines utilisant Ashby.

Ashby expose une API publique avec fourchettes de salaire.
"""

from app.collectors.ats.ashby import AshbyCollector


class MKopaAshby(AshbyCollector):
    """M-KOPA - Energie solaire (Afrique de l'Est)."""
    def __init__(self):
        super().__init__(board_name="m-kopa", source_name="M-KOPA")


class LemFiAshby(AshbyCollector):
    """LemFi (ex-Lemonade Finance) - Fintech transfert."""
    def __init__(self):
        super().__init__(board_name="lemfi", source_name="LemFi")


class SabiAshby(AshbyCollector):
    """Sabi - B2B e-commerce (Nigeria/Kenya)."""
    def __init__(self):
        super().__init__(board_name="sabi", source_name="Sabi")


class RelianceHealthAshby(AshbyCollector):
    """Reliance Health - HealthTech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="reliance-health", source_name="Reliance Health", country="Nigeria")


class PagaAshby(AshbyCollector):
    """Paga - Fintech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="paga", source_name="Paga", country="Nigeria")


class FairMoneyAshby(AshbyCollector):
    """FairMoney - Fintech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="fairmoney", source_name="FairMoney", country="Nigeria")


class PiggyvestAshby(AshbyCollector):
    """PiggyVest - Epargne (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="piggyvest", source_name="PiggyVest", country="Nigeria")


class CowrywiseAshby(AshbyCollector):
    """Cowrywise - Epargne/investissement (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="cowrywise", source_name="Cowrywise", country="Nigeria")


class SpleetAshby(AshbyCollector):
    """Spleet - Proptech (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="spleet", source_name="Spleet", country="Nigeria")


class StearsAshby(AshbyCollector):
    """Stears - Data/Media (Nigeria)."""
    def __init__(self):
        super().__init__(board_name="stears", source_name="Stears", country="Nigeria")


ALL_ASHBY_SOURCES = [
    MKopaAshby,
    LemFiAshby,
    SabiAshby,
    RelianceHealthAshby,
    PagaAshby,
    FairMoneyAshby,
    PiggyvestAshby,
    CowrywiseAshby,
    SpleetAshby,
    StearsAshby,
]
