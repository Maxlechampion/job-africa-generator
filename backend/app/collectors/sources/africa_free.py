"""
Sources africaines gratuites supplementaires.

Chaque source est un flux RSS ou un site scrape gracieusement.
"""

from app.collectors.rss_collector import RSSCollector


# ==================== NIGERIA ====================
class MyJobMagRSS(RSSCollector):
    """MyJobMag - Job board nigerian."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.myjobmag.com/rss/jobs",
            source_name="MyJobMag",
            country="Nigeria",
        )


class JobzillaRSS(RSSCollector):
    """Jobzilla Nigeria."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.jobzilla.ng/feed/",
            source_name="Jobzilla",
            country="Nigeria",
        )


# ==================== BENIN ====================
class BeninWebTVRSS(RSSCollector):
    """Benin Web TV - Emploi."""

    def __init__(self):
        super().__init__(
            feed_url="https://beninwebtv.bj/emploi-benin/feed/",
            source_name="Benin Web TV",
            country="Benin",
        )


class BeninIntelligentRSS(RSSCollector):
    """Benin Intelligent - Emploi."""

    def __init__(self):
        super().__init__(
            feed_url="https://beninintelligent.com/feed/",
            source_name="Benin Intelligent",
            country="Benin",
        )


# ==================== SENEGAL ====================
class EmploiSenegalRSS(RSSCollector):
    """Emploi Senegal - RSS WordPress."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.emploisenegal.com/feed/",
            source_name="Emploi Senegal",
            country="Senegal",
        )


class ConcoursnRSS(RSSCollector):
    """Concoursn - Concours et emplois au Senegal."""

    def __init__(self):
        super().__init__(
            feed_url="https://concoursn.com/feed/",
            source_name="Concoursn Senegal",
            country="Senegal",
        )


# ==================== COTE D'IVOIRE ====================
class EmploiCIRSS(RSSCollector):
    """Emploi Cote d'Ivoire - RSS."""

    def __init__(self):
        super().__init__(
            feed_url="https://www.emploi.ci/feed/",
            source_name="Emploi Cote d'Ivoire",
            country="Cote d'Ivoire",
        )


class ProjobivoireRSS(RSSCollector):
    """Projobivoire - RSS."""

    def __init__(self):
        super().__init__(
            feed_url="https://projobivoire.com/feed/",
            source_name="Projobivoire",
            country="Cote d'Ivoire",
        )


# ==================== REGISTRE ====================
ALL_AFRICA_FREE_SOURCES = [
    # Nigeria
    # MyJobMagRSS,
    JobzillaRSS,

    # Benin
    # BeninWebTVRSS,
    # BeninIntelligentRSS,

    # Senegal
    # EmploiSenegalRSS,
    ConcoursnRSS,

    # Cote d'Ivoire
    # EmploiCIRSS,
    ProjobivoireRSS,
]
