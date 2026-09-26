"""
Scheduler automatique de collecte.

Utilise APScheduler (BackgroundScheduler) pour lancer
la collecte de toutes les sources a intervalle regulier.

Fonctionnalites :
    - Collecte periodique (defaut : toutes les 6h)
    - Orchestration de tous les collecteurs (RSS + ATS + Google Jobs)
    - Journalisation en base (table collect_logs)
    - Nettoyage automatique (offres premium expirees)
    - Start/Stop propre
"""

import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.logger import get_logger
from app.collectors.sources.relay_rss import ALL_SOURCES
from app.collectors.google_jobs import GoogleJobsCollector
from app.collectors.scrapers.sources.jobberman import JobbermanScraper
from app.collectors.scrapers.sources.emploirapide import EmploiRapideScraper
from app.collectors.sources.fuzu import FuzuCollector
from app.collectors.scrapers.sources.benin_digital import BeninDigitalScraper
from app.collectors.sources.benin_rss.la_tempete import LaTempeteBeninRSS
from app.services.job_service import bulk_create_jobs
from app.services.log_service import log_collect
from app.collectors.ats.greenhouse_sources import ALL_GREENHOUSE_SOURCES
from app.collectors.ats.ashby_sources import ALL_ASHBY_SOURCES
from app.collectors.ats.lever import LeverCollector


logger = get_logger(__name__)


# ==================== Scheduler global ====================
scheduler = BackgroundScheduler(
    timezone="UTC",
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 300,
    },
)


# ==================== Collecte RSS + ATS ====================
def run_all_collectors() -> dict:
    """
    Lance tous les collecteurs (RSS + Google Jobs).

    Returns:
        Resume de la collecte
    """

    logger.info("=" * 60)
    logger.info("Demarrage de la collecte automatique")
    logger.info("=" * 60)

    start_time = time.time()

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    # ==================== 1. SOURCES RSS + ATS ====================
    for CollectorClass in ALL_SOURCES:
        collector = CollectorClass()
        source_name = collector.name

        source_start = time.time()

        try:
            jobs = collector.collect()
            collected = len(jobs)

            if collected == 0:
                duree = time.time() - source_start

                log_collect(
                    source_nom=source_name,
                    statut="success",
                    offres_collectees=0,
                    offres_inserees=0,
                    offres_ignorees=0,
                    duree_secondes=round(duree, 2),
                )

                details.append({
                    "source": source_name,
                    "status": "empty",
                    "collected": 0,
                    "inserted": 0,
                    "skipped": 0,
                })

                logger.info(f"  [SKIP] {source_name} : aucune offre")
                continue

            result = bulk_create_jobs(jobs)

            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            duree = time.time() - source_start

            log_collect(
                source_nom=source_name,
                statut="success",
                offres_collectees=collected,
                offres_inserees=inserted,
                offres_ignorees=skipped,
                duree_secondes=round(duree, 2),
            )

            details.append({
                "source": source_name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
                "duration": round(duree, 2),
            })

            logger.info(
                f"  [OK] {source_name} : "
                f"{collected} collectees, "
                f"{inserted} inserees, "
                f"{skipped} ignorees "
                f"({duree:.1f}s)"
            )

        except Exception as e:
            total_errors += 1

            duree = time.time() - source_start
            error_msg = str(e)[:500]

            log_collect(
                source_nom=source_name,
                statut="error",
                offres_collectees=0,
                offres_inserees=0,
                offres_ignorees=0,
                duree_secondes=round(duree, 2),
                erreur=error_msg,
            )

            details.append({
                "source": source_name,
                "status": "error",
                "error": error_msg,
                "duration": round(duree, 2),
            })

            logger.error(f"  [ERR] {source_name} : {error_msg}")

    # ==================== 2. GOOGLE JOBS ====================
    logger.info("-" * 60)
    logger.info("Collecte Google Jobs...")
    logger.info("-" * 60)

    google_start = time.time()

    try:
        google_collector = GoogleJobsCollector(
            search_terms=[
                "developer",
                "marketing",
                "accountant",
            ],
            locations=[
                "Cotonou, Benin",
                "Dakar, Senegal",
                "Abidjan, Cote d'Ivoire",
            ],
            results_per_query=10,
        )

        google_jobs = google_collector.safe_collect()
        collected = len(google_jobs)

        if collected == 0:
            duree = time.time() - google_start

            log_collect(
                source_nom="Google Jobs",
                statut="success",
                offres_collectees=0,
                offres_inserees=0,
                offres_ignorees=0,
                duree_secondes=round(duree, 2),
            )

            details.append({
                "source": "Google Jobs",
                "status": "empty",
                "collected": 0,
            })

            logger.info("  [SKIP] Google Jobs : aucune offre")

        else:
            result = bulk_create_jobs(google_jobs)

            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            duree = time.time() - google_start

            log_collect(
                source_nom="Google Jobs",
                statut="success",
                offres_collectees=collected,
                offres_inserees=inserted,
                offres_ignorees=skipped,
                duree_secondes=round(duree, 2),
            )

            details.append({
                "source": "Google Jobs",
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
                "duration": round(duree, 2),
            })

            logger.info(
                f"  [OK] Google Jobs : "
                f"{collected} collectees, "
                f"{inserted} inserees, "
                f"{skipped} ignorees "
                f"({duree:.1f}s)"
            )

    except Exception as e:
        total_errors += 1

        duree = time.time() - google_start
        error_msg = str(e)[:500]

        log_collect(
            source_nom="Google Jobs",
            statut="error",
            offres_collectees=0,
            offres_inserees=0,
            offres_ignorees=0,
            duree_secondes=round(duree, 2),
            erreur=error_msg,
        )

        details.append({
            "source": "Google Jobs",
            "status": "error",
            "error": error_msg,
            "duration": round(duree, 2),
        })

        logger.error(f"  [ERR] Google Jobs : {error_msg}")

    # ==================== RESUME ====================
    total_duree = time.time() - start_time

    logger.info("=" * 60)
    logger.info(
        f"Collecte terminee en {total_duree:.1f}s : "
        f"{total_collected} collectees, "
        f"{total_inserted} inserees, "
        f"{total_skipped} ignorees, "
        f"{total_errors} erreurs"
    )
    logger.info("=" * 60)

    return {
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "total_duration": round(total_duree, 2),
        "details": details,
    }




# ==================== SOURCES BÉNIN ====================
BENIN_SOURCES = [
    BeninDigitalScraper,   # 45 offres tech (scraper HTML)
    LaTempeteBeninRSS,     # PSIE (RSS)
]


def run_benin_collectors() -> dict:
    """Lance les sources Bénin (Benin Digital + La Tempête)."""

    logger.info("-" * 60)
    logger.info("Collecte sources Benin...")
    logger.info("-" * 60)

    total_collected = 0
    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    details = []

    for SourceClass in BENIN_SOURCES:
        source = SourceClass()
        name = source.name

        source_start = time.time()

        try:
            jobs = source.collect()
            collected = len(jobs)

            if collected == 0:
                details.append({
                    "source": name,
                    "status": "empty",
                    "collected": 0,
                })
                logger.info(f"  [SKIP] {name} : aucune offre")
                continue

            result = bulk_create_jobs(jobs)
            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted
            total_skipped += skipped

            duree = time.time() - source_start

            details.append({
                "source": name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
                "duration": round(duree, 2),
            })

            logger.info(
                f"  [OK] {name} : {collected} collectees, "
                f"{inserted} inserees, {skipped} ignorees ({duree:.1f}s)"
            )

        except Exception as e:
            total_errors += 1
            error_msg = str(e)[:200]

            details.append({
                "source": name,
                "status": "error",
                "error": error_msg,
            })
            logger.error(f"  [ERR] {name} : {error_msg}")

    logger.info(
        f"Benin termine : {total_collected} collectees, "
        f"{total_inserted} inserees, {total_errors} erreurs"
    )

    return {
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "total_errors": total_errors,
        "details": details,
    }


# ==================== WRAPPER GLOBAL ====================
_original_run_all = run_all_collectors


def run_all_collectors_with_benin() -> dict:
    """Wrapper : collecte globale + sources Benin."""

    # 1. Collecte globale (RSS + Google Jobs)
    result = _original_run_all()

    # 2. Collecte Benin
    benin = run_benin_collectors()

    # 3. Fusion des resultats
    result["total_collected"] += benin["total_collected"]
    result["total_inserted"] += benin["total_inserted"]
    result["total_skipped"] += benin["total_skipped"]
    result["total_errors"] += benin["total_errors"]
    result["details"].extend(benin["details"])

    return result




# ==================== SOURCES AFRIQUE (Jobberman + Fuzu + EmploiRapide) ====================
AFRICA_SOURCES = [
    JobbermanScraper,       # Nigeria / Ghana
    FuzuCollector,          # Kenya / Nigeria / Uganda
    EmploiRapideScraper,    # Cote d'Ivoire
]


def run_africa_collectors() -> dict:
    """Lance les sources africaines majeures."""

    logger.info("-" * 60)
    logger.info("Collecte sources Afrique...")
    logger.info("-" * 60)

    total_collected = 0
    total_inserted = 0
    total_errors = 0
    details = []

    for SourceClass in AFRICA_SOURCES:
        source = SourceClass()
        name = source.name
        source_start = time.time()

        try:
            jobs = source.collect()
            collected = len(jobs)

            if collected == 0:
                details.append({
                    "source": name,
                    "status": "empty",
                    "collected": 0,
                })
                logger.info(f"  [SKIP] {name} : aucune offre")
                continue

            result = bulk_create_jobs(jobs)
            inserted = result.get("inserted", 0)
            skipped = result.get("skipped", 0)

            total_collected += collected
            total_inserted += inserted

            duree = time.time() - source_start

            details.append({
                "source": name,
                "status": "success",
                "collected": collected,
                "inserted": inserted,
                "skipped": skipped,
                "duration": round(duree, 2),
            })

            logger.info(
                f"  [OK] {name} : {collected} collectees, "
                f"{inserted} inserees, {skipped} ignorees ({duree:.1f}s)"
            )

        except Exception as e:
            total_errors += 1
            error_msg = str(e)[:200]
            details.append({
                "source": name,
                "status": "error",
                "error": error_msg,
            })
            logger.error(f"  [ERR] {name} : {error_msg}")

    return {
        "total_collected": total_collected,
        "total_inserted": total_inserted,
        "total_errors": total_errors,
        "details": details,
    }

# ==================== Nettoyage ====================
def cleanup_expired():
    """
    Tache de nettoyage : desactive les offres premium expirees.
    """

    logger.info("Nettoyage des offres expirees...")

    # Placeholder - implemente dans le module 14 (monetisation)
    # from app.services.premium_service import deactivate_expired_premium
    # from app.services.sponsored_service import deactivate_expired_sponsored
    # deactivate_expired_premium()
    # deactivate_expired_sponsored()

    logger.info("Nettoyage termine")


# ==================== Demarrage / Arret ====================
def start_scheduler():
    """
    Demarre le scheduler.

    Ajoute 2 jobs :
        1. Collecte automatique (toutes les COLLECT_INTERVAL_HOURS heures)
        2. Nettoyage (toutes les heures)
    """

    if scheduler.running:
        logger.warning("Scheduler deja en cours d'execution")
        return

    interval_hours = settings.COLLECT_INTERVAL_HOURS

    # ==================== Job 1 : Collecte ====================
    scheduler.add_job(
        run_all_collectors_with_benin,
        trigger=IntervalTrigger(hours=interval_hours),
        id="collect_jobs",
        name=f"Collecte automatique ({interval_hours}h)",
        replace_existing=True,
    )

    # ==================== Job 2 : Nettoyage ====================
    scheduler.add_job(
        cleanup_expired,
        trigger=IntervalTrigger(hours=1),
        id="cleanup_expired",
        name="Nettoyage offres expirees (1h)",
        replace_existing=True,
    )

    # ==================== Demarrage ====================
    scheduler.start()

    logger.info("=" * 60)
    logger.info("Scheduler demarre")
    logger.info(f"   Collecte automatique : toutes les {interval_hours}h")
    logger.info("   Nettoyage : toutes les 1h")
    logger.info("=" * 60)


def stop_scheduler():
    """Arrete le scheduler proprement."""

    if not scheduler.running:
        return

    try:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler arrete")
    except Exception as e:
        logger.error(f"Erreur arret scheduler : {e}")


def get_scheduler_status() -> dict:
    """Retourne le statut du scheduler et la liste des jobs."""

    jobs = []

    if scheduler.running:
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": (
                    job.next_run_time.isoformat()
                    if job.next_run_time else None
                ),
                "trigger": str(job.trigger),
            })

    return {
        "running": scheduler.running,
        "jobs": jobs,
        "collect_interval_hours": settings.COLLECT_INTERVAL_HOURS,
    }