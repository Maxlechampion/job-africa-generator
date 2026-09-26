"""
Registre des entreprises africaines utilisant Greenhouse.

Ces entreprises publient leurs offres via des APIs publiques,
sans cle ni authentification.

Verifier regulierement que les tokens sont toujours valides.
"""

from app.collectors.ats.greenhouse import GreenhouseCollector


# ==================== Fintech ====================

class MoniepointGreenhouse(GreenhouseCollector):
    """Moniepoint - Fintech nigeriane (Lagos)."""
    def __init__(self):
        super().__init__(token="moniepoint", source_name="Moniepoint", country="Nigeria")


class FlutterwaveGreenhouse(GreenhouseCollector):
    """Flutterwave - Fintech paiements (panafricain)."""
    def __init__(self):
        super().__init__(token="flutterwave", source_name="Flutterwave", country="Nigeria")


class PaystackGreenhouse(GreenhouseCollector):
    """Paystack - Fintech paiements (Nigeria)."""
    def __init__(self):
        super().__init__(token="paystack", source_name="Paystack", country="Nigeria")


class CarbonGreenhouse(GreenhouseCollector):
    """Carbon (ex-OneFi) - Fintech credit (Nigeria)."""
    def __init__(self):
        super().__init__(token="carbon", source_name="Carbon", country="Nigeria")


class TeamAptGreenhouse(GreenhouseCollector):
    """TeamApt - Fintech paiements (Nigeria)."""
    def __init__(self):
        super().__init__(token="teamapt", source_name="TeamApt", country="Nigeria")


class KudaGreenhouse(GreenhouseCollector):
    """Kuda - Neobanque (Nigeria)."""
    def __init__(self):
        super().__init__(token="kuda", source_name="Kuda", country="Nigeria")


class ChipperCashGreenhouse(GreenhouseCollector):
    """Chipper Cash - Transfert d'argent (panafricain)."""
    def __init__(self):
        super().__init__(token="chippercash", source_name="Chipper Cash", country="Kenya")


class WaveGreenhouse(GreenhouseCollector):
    """Wave - Mobile Money (Senegal/CI)."""
    def __init__(self):
        super().__init__(token="wave", source_name="Wave", country="Senegal")


# ==================== E-commerce / Marketplaces ====================

class JumiaGreenhouse(GreenhouseCollector):
    """Jumia - E-commerce panafricain."""
    def __init__(self):
        super().__init__(token="jumia", source_name="Jumia")


class KongaGreenhouse(GreenhouseCollector):
    """Konga - E-commerce (Nigeria)."""
    def __init__(self):
        super().__init__(token="konga", source_name="Konga", country="Nigeria")


class KilimallGreenhouse(GreenhouseCollector):
    """Kilimall - E-commerce (Kenya)."""
    def __init__(self):
        super().__init__(token="kilimall", source_name="Kilimall", country="Kenya")


# ==================== Tech / SaaS ====================

class AndelaGreenhouse(GreenhouseCollector):
    """Andela - Talent marketplace (panafricain)."""
    def __init__(self):
        super().__init__(token="andela", source_name="Andela")


class TwigaGreenhouse(GreenhouseCollector):
    """Twiga Foods - AgTech (Kenya)."""
    def __init__(self):
        super().__init__(token="twigafoods", source_name="Twiga Foods", country="Kenya")


class MKopaGreenhouse(GreenhouseCollector):
    """M-KOPA - Energie solaire (Kenya/Uganda/Nigeria)."""
    def __init__(self):
        super().__init__(token="m-kopa", source_name="M-KOPA")


# ==================== ONG / Impact ====================

class OneAcreFundGreenhouse(GreenhouseCollector):
    """One Acre Fund - AgTech (Afrique de l'Est)."""
    def __init__(self):
        super().__init__(token="oneacrefund", source_name="One Acre Fund")


class GiveDirectlyGreenhouse(GreenhouseCollector):
    """GiveDirectly - ONG cash transfers (panafricain)."""
    def __init__(self):
        super().__init__(token="givedirectly", source_name="GiveDirectly")


# ==================== Registre ====================

ALL_GREENHOUSE_SOURCES = [
    # Fintech
    MoniepointGreenhouse,
    FlutterwaveGreenhouse,
    PaystackGreenhouse,
    CarbonGreenhouse,
    TeamAptGreenhouse,
    KudaGreenhouse,
    ChipperCashGreenhouse,
    WaveGreenhouse,

    # E-commerce
    JumiaGreenhouse,
    KongaGreenhouse,
    KilimallGreenhouse,

    # Tech / SaaS
    AndelaGreenhouse,
    TwigaGreenhouse,
     MKopaGreenhouse,

    # ONG / Impact
    OneAcreFundGreenhouse,
    GiveDirectlyGreenhouse,
]
