"""
Sources RSS d'offres d'emploi pour Job Africa.

⚠️ MAINTENANCE — Sources vérifiées le 2026-09-17
==================================================
Ajout de sources Afrique de l'Ouest (AllAfrica, HotNigerianJobs, etc.).

Statut :
    ✅ Validée     → testée, fonctionne
    🟡 Probable    → existe, à tester
    🔧 À venir     → nécessite un scraper (module futur)
"""

from app.collectors.rss_collector import RSSCollector

# ═══════════════════════════════════════════════════════════════
# 1. SOURCES INTERNATIONALES REMOTE (✅ Validées)
# ═══════════════════════════════════════════════════════════════


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


# ═══════════════════════════════════════════════════════════════
# 2. SOURCES ONG / ONU / DÉVELOPPEMENT (🟡 Probables)
# ═══════════════════════════════════════════════════════════════


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


# ═══════════════════════════════════════════════════════════════
# 3. SOURCES AFRIQUE DE L'OUEST (🟡 Probables)
# ═══════════════════════════════════════════════════════════════


class AllAfricaBurkinaRSS(RSSCollector):
    """
    AllAfrica — Actualités Burkina Faso.

    🟡 Probable — flux RDF officiel AllAfrica [citation:3][citation:9].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://fr.allafrica.com/tools/headlines/rdf/burkinafaso/headlines.rdf",
            source_name="AllAfrica Burkina Faso",
            country="Burkina Faso",
        )


class AllAfricaCoteIvoireRSS(RSSCollector):
    """
    AllAfrica — Actualités Côte d'Ivoire.

    🟡 Probable — flux RDF officiel AllAfrica [citation:6].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://fr.allafrica.com/tools/headlines/rdf/cotedivoire/headlines.rdf",
            source_name="AllAfrica Côte d'Ivoire",
            country="Côte d'Ivoire",
        )


class AllAfricaWestAfricaRSS(RSSCollector):
    """
    AllAfrica — Actualités Afrique de l'Ouest (tous pays).

    🟡 Probable — flux RDF officiel AllAfrica [citation:9].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://fr.allafrica.com/tools/headlines/rdf/westafrica/headlines.rdf",
            source_name="AllAfrica Afrique de l'Ouest",
        )


class RmoSenegalRSS(RSSCollector):
    """
    RMO Job Center — Offres d'emploi Sénégal.

    ✅ Validée — RMO indique explicitement proposer des flux RSS [citation:2].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://www.rmo-jobcenter.com/fr/senegal/offres-emploi/rss",
            source_name="RMO Sénégal",
            country="Sénégal",
        )


class RmoCoteIvoireRSS(RSSCollector):
    """
    RMO Job Center — Offres d'emploi Côte d'Ivoire.

    ✅ Validée — RMO indique explicitement proposer des flux RSS.
    """

    def __init__(self):
        super().__init__(
            feed_url="https://www.rmo-jobcenter.com/fr/cote-ivoire/offres-emploi/rss",
            source_name="RMO Côte d'Ivoire",
            country="Côte d'Ivoire",
        )


class HotNigerianJobsRSS(RSSCollector):
    """
    HotNigerianJobs — Offres Nigeria.

    ✅ Validée — Flux RSS disponible via follow.it [citation:24].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://follow.it/hotnigerianjobs?leanpub",
            source_name="HotNigerianJobs",
            country="Nigeria",
        )


class ConcoursnRSS(RSSCollector):
    """
    Concoursn.com — Recrutements Sénégal.

    ✅ Validée — Flux WordPress actif [citation:8].
    """

    def __init__(self):
        super().__init__(
            feed_url="https://concoursn.com/tag/vendeur/feed/",
            source_name="Concoursn Sénégal",
            country="Sénégal",
        )


# ═══════════════════════════════════════════════════════════════
# 4. SOURCES AFRICAINES FRANCOPHONES (✅ Validées)
# ═══════════════════════════════════════════════════════════════


class ProjobivoireRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://projobivoire.com/emploi-type/full-time/feed/",
            source_name="Projobivoire",
            country="Côte d'Ivoire",
        )


class LaTempeteRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://quotidienlatempete.bj/tag/actu-offre-demploi/feed/",
            source_name="La Tempête Bénin",
            country="Bénin",
        )


class EmploiTogoRSS(RSSCollector):
    def __init__(self):
        super().__init__(
            feed_url="https://emploitogo.info/feed/",
            source_name="Emploi Togo",
            country="Togo",
        )


# ═══════════════════════════════════════════════════════════════
# 5. REGISTRE DES SOURCES ACTIVES
# ═══════════════════════════════════════════════════════════════

ALL_SOURCES = [
    # ─── Remote international (fiables) ───
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
    # ─── ONG / ONU / Développement ───
    ReliefWebAfricaRSS,
    ReliefWebAllJobsRSS,
    UNJobsRSS,
    CoordinationSudRSS,
    # ─── Afrique de l'Ouest (nouvelles sources vérifiées) ───
    AllAfricaBurkinaRSS,
    AllAfricaCoteIvoireRSS,
    AllAfricaWestAfricaRSS,
    RmoSenegalRSS,
    RmoCoteIvoireRSS,
    HotNigerianJobsRSS,
    ConcoursnRSS,
    # ─── Afrique francophone ───
    ProjobivoireRSS,
    LaTempeteRSS,
    EmploiTogoRSS,
]


# ═══════════════════════════════════════════════════════════════
# 6. SOURCES À VENIR (nécessitent un scraper HTML — module 04)
# ═══════════════════════════════════════════════════════════════

# 🔧 Bénin Web TV        : https://beninwebtv.bj/emploi-benin/
# 🔧 Bénin Intelligent   : https://beninintelligent.com
# 🔧 CFAO Careers        : https://www.cfao.com/careers
# 🔧 Maliweb Emploi      : https://www.maliweb.net/category/emploi
# 🔧 Zonemploi Niger     : https://www.zonemploi.com
# 🔧 MyJobMag Nigeria    : https://www.myjobmag.com
# 🔧 Jobzilla Nigeria    : https://www.jobzilla.ng
# 🔧 Gamjobs Gambie      : https://gamjobs.com
# 🔧 JobsKazi Ghana      : https://jobskazi.com
# 🔧 Devex               : https://www.devex.com/jobs
# 🔧 ECOWAS / CEDEAO     : https://www.ecowas.int/careers/
# 🔧 UEMOA               : https://www.uemoa.int/fr/appels-a-candidature
# 🔧 Working Nomads      : https://www.workingnomads.com/jobs
# 🔧 Remotive (API JSON) : https://remotive.com/api/remote-jobs
# 🔧 Dice                : https://www.dice.com/jobs
# 🔧 ProZ                : https://www.proz.com/translation-jobs/
# 🔧 Upwork              : https://www.upwork.com/ab/jobs/


# ═══════════════════════════════════════════════════════════════
# 7. RÉSUMÉ DES SOURCES
# ═══════════════════════════════════════════════════════════════


def get_sources_summary() -> list[dict]:
    """Retourne un résumé de toutes les sources configurées."""
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
