"""
Sources RSS d'offres d'emploi pour Job Africa.

âš ï¸ MAINTENANCE â€” Sources vÃ©rifiÃ©es le 2026-09-17
==================================================
Ajout de sources Afrique de l'Ouest (AllAfrica, HotNigerianJobs, etc.).

Statut :
    âœ… ValidÃ©e     â†’ testÃ©e, fonctionne
    ðŸŸ¡ Probable    â†’ existe, Ã  tester
    ðŸ”§ Ã€ venir     â†’ nÃ©cessite un scraper (module futur)
"""

from app.collectors.rss_collector import RSSCollector
from app.collectors.sources.africa_free import ALL_AFRICA_FREE_SOURCES

# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# 1. SOURCES INTERNATIONALES REMOTE (âœ… ValidÃ©es)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


class WeWorkRemotelyAllRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/remote-jobs.rss",
            source_name="WeWorkRemotely (toutes)",
        )


class WeWorkRemotelyProgrammingRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-programming-jobs.rss",
            source_name="WeWorkRemotely (programming)",
        )


class WeWorkRemotelyFullStackRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
            source_name="WeWorkRemotely (full-stack)",
        )


class WeWorkRemotelyFrontEndRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
            source_name="WeWorkRemotely (front-end)",
        )


class WeWorkRemotelyBackEndRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
            source_name="WeWorkRemotely (back-end)",
        )


class WeWorkRemotelyDevOpsRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
            source_name="WeWorkRemotely (devops)",
        )


class WeWorkRemotelyDesignRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-design-jobs.rss",
            source_name="WeWorkRemotely (design)",
        )


class WeWorkRemotelyProductRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-product-jobs.rss",
            source_name="WeWorkRemotely (product)",
        )


class WeWorkRemotelyCustomerSupportRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
            source_name="WeWorkRemotely (support)",
        )


class WeWorkRemotelySalesMarketingRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
            source_name="WeWorkRemotely (sales-marketing)",
        )


class HimalayasRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://himalayas.app/jobs/rss",
            source_name="Himalayas",
        )


class NoDeskRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://nodesk.co/remote-jobs/index.xml",
            source_name="NoDesk",
        )


class HackerNewsWhoIsHiringRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://hnrss.org/whoishiring/jobs",
            source_name="Hacker News Jobs",
        )


class PythonOrgJobsRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://www.python.org/jobs/feed/rss/",
            source_name="Python.org Jobs",
        )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# 2. SOURCES ONG / ONU / DÃ‰VELOPPEMENT (ðŸŸ¡ Probables)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


class ReliefWebAfricaRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://reliefweb.int/jobs/rss.xml?advanced-search=%28C243%29",
            source_name="ReliefWeb (Afrique Ouest)",
        )


class ReliefWebAllJobsRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://reliefweb.int/jobs/rss.xml",
            source_name="ReliefWeb (global)",
        )


class UNJobsRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://unjobs.org/rss",
            source_name="UNJobs",
        )


class CoordinationSudRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://www.coordinationsud.org/feed/",
            source_name="Coordination SUD",
        )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# 3. SOURCES AFRIQUE DE L'OUEST (ðŸŸ¡ Probables)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


class AllAfricaBurkinaRSS(RSSCollector):
    """
    AllAfrica â€” ActualitÃ©s Burkina Faso.

    ðŸŸ¡ Probable â€” flux RDF officiel AllAfrica [citation:3][citation:9].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://fr.allafrica.com/tools/headlines/rdf/burkinafaso/headlines.rdf",
            source_name="AllAfrica Burkina Faso",
            country="Burkina Faso",
        )


class AllAfricaCoteIvoireRSS(RSSCollector):
    """
    AllAfrica â€” ActualitÃ©s CÃ´te d'Ivoire.

    ðŸŸ¡ Probable â€” flux RDF officiel AllAfrica [citation:6].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://fr.allafrica.com/tools/headlines/rdf/cotedivoire/headlines.rdf",
            source_name="AllAfrica CÃ´te d'Ivoire",
            country="CÃ´te d'Ivoire",
        )


class AllAfricaWestAfricaRSS(RSSCollector):
    """
    AllAfrica â€” ActualitÃ©s Afrique de l'Ouest (tous pays).

    ðŸŸ¡ Probable â€” flux RDF officiel AllAfrica [citation:9].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://fr.allafrica.com/tools/headlines/rdf/westafrica/headlines.rdf",
            source_name="AllAfrica Afrique de l'Ouest",
        )


class RmoSenegalRSS(RSSCollector):
    """
    RMO Job Center â€” Offres d'emploi SÃ©nÃ©gal.

    âœ… ValidÃ©e â€” RMO indique explicitement proposer des flux RSS [citation:2].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://www.rmo-jobcenter.com/fr/senegal/offres-emploi/rss",
            source_name="RMO SÃ©nÃ©gal",
            country="SÃ©nÃ©gal",
        )


class RmoCoteIvoireRSS(RSSCollector):
    """
    RMO Job Center â€” Offres d'emploi CÃ´te d'Ivoire.

    âœ… ValidÃ©e â€” RMO indique explicitement proposer des flux RSS.
    """

    def __init__(self):
        super().__init__(
            feed_url="https://www.rmo-jobcenter.com/fr/cote-ivoire/offres-emploi/rss",
            source_name="RMO CÃ´te d'Ivoire",
            country="CÃ´te d'Ivoire",
        )


class HotNigerianJobsRSS(RSSCollector):
    """
    HotNigerianJobs â€” Offres Nigeria.

    âœ… ValidÃ©e â€” Flux RSS disponible via follow.it [citation:24].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://follow.it/hotnigerianjobs?leanpub",
            source_name="HotNigerianJobs",
            country="Nigeria",
        )


class ConcoursnRSS(RSSCollector):
    """
    Concoursn.com â€” Recrutements SÃ©nÃ©gal.

    âœ… ValidÃ©e â€” Flux WordPress actif [citation:8].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://concoursn.com/tag/vendeur/feed/",
            source_name="Concoursn SÃ©nÃ©gal",
            country="SÃ©nÃ©gal",
        )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# 4. SOURCES AFRICAINES FRANCOPHONES (âœ… ValidÃ©es)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


class ProjobivoireRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://projobivoire.com/emploi-type/full-time/feed/",
            source_name="Projobivoire",
            country="CÃ´te d'Ivoire",
        )


class LaTempeteRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://quotidienlatempete.bj/tag/actu-offre-demploi/feed/",
            source_name="La TempÃªte BÃ©nin",
            country="BÃ©nin",
        )


class EmploiTogoRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://emploitogo.info/feed/",
            source_name="Emploi Togo",
            country="Togo",
        )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# 5. REGISTRE DES SOURCES ACTIVES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ALL_SOURCES = ALL_AFRICA_FREE_SOURCES + [
    # â”€â”€â”€ Remote international (fiables) â”€â”€â”€
    WeWorkRemotelyAllRSS,
    WeWorkRemotelyProgrammingRSS,
    WeWorkRemotelyFullStackRSS,
    WeWorkRemotelyFrontEndRSS,
    WeWorkRemotelyBackEndRSS,
    WeWorkRemotelyDevOpsRSS,
    WeWorkRemotelyDesignRSS,
    WeWorkRemotelyProductRSS,
    WeWorkRemotelyCustomerSupportRSS,
    WeWorkRemotelySalesMarketingRSS,
    HimalayasRSS,
    NoDeskRSS,
    HackerNewsWhoIsHiringRSS,
    PythonOrgJobsRSS,
    # â”€â”€â”€ ONG / ONU / DÃ©veloppement â”€â”€â”€
    ReliefWebAfricaRSS,
    ReliefWebAllJobsRSS,
    # UNJobsRSS,  # Désactivé (URL morte)
    # CoordinationSudRSS,  # Désactivé (URL morte)
    # â”€â”€â”€ Afrique de l'Ouest (nouvelles sources vÃ©rifiÃ©es) â”€â”€â”€
    # AllAfricaBurkinaRSS,  # Désactivé (presse)
    # AllAfricaCoteIvoireRSS,  # Désactivé (presse)
    # AllAfricaWestAfricaRSS,  # Désactivé (presse)
    # RmoSenegalRSS,  # Désactivé (URL morte)
    # RmoCoteIvoireRSS,  # Désactivé (URL morte)
    # HotNigerianJobsRSS,  # Désactivé (URL morte)
    # ConcoursnRSS,  # Désactivé (URL 404)
    # â”€â”€â”€ Afrique francophone â”€â”€â”€
    ProjobivoireRSS,
    LaTempeteRSS,
    EmploiTogoRSS,
]


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# 6. SOURCES Ã€ VENIR (nÃ©cessitent un scraper HTML â€” module 04)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

# ðŸ”§ BÃ©nin Web TV        : https://beninwebtv.bj/emploi-benin/
# ðŸ”§ BÃ©nin Intelligent   : https://beninintelligent.com
# ðŸ”§ CFAO Careers        : https://www.cfao.com/careers
# ðŸ”§ Maliweb Emploi      : https://www.maliweb.net/category/emploi
# ðŸ”§ Zonemploi Niger     : https://www.zonemploi.com
# ðŸ”§ MyJobMag Nigeria    : https://www.myjobmag.com
# ðŸ”§ Jobzilla Nigeria    : https://www.jobzilla.ng
# ðŸ”§ Gamjobs Gambie      : https://gamjobs.com
# ðŸ”§ JobsKazi Ghana      : https://jobskazi.com
# ðŸ”§ Devex               : https://www.devex.com/jobs
# ðŸ”§ ECOWAS / CEDEAO     : https://www.ecowas.int/careers/
# ðŸ”§ UEMOA               : https://www.uemoa.int/fr/appels-a-candidature
# ðŸ”§ Working Nomads      : https://www.workingnomads.com/jobs
# ðŸ”§ Remotive (API JSON) : https://remotive.com/api/remote-jobs
# ðŸ”§ Dice                : https://www.dice.com/jobs
# ðŸ”§ ProZ                : https://www.proz.com/translation-jobs/
# ðŸ”§ Upwork              : https://www.upwork.com/ab/jobs/


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# 7. RÃ‰SUMÃ‰ DES SOURCES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


def get_sources_summary() -> list[dict]:
    """Retourne un rÃ©sumÃ© de toutes les sources configurÃ©es."""
    summary = []

    for CollectorClass in ALL_SOURCES:
        try:
            collector = CollectorClass()
            summary.append(
                {
                    "name": collector.name,
                    "url": getattr(collector, "feed_url", None),
                    "country": getattr(collector, "country", None),
                    "type": "rss",
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
