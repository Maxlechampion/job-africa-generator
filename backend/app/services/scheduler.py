"""
Scheduler automatique de collecte.

Utilise APScheduler pour lancer la collecte de toutes les
sources a intervalle regulier.

Usage :
    from app.services.scheduler import start_scheduler, stop_scheduler
    start_scheduler()  # au startup de FastAPI
    stop_scheduler()   # a l'arret
"""

import time

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.collectors.sources.relay_rss import ALL_SOURCES
from app.core.config import settings
from app.core.logger import get_logger
from app.services.job_service import bulk_create_jobs
from app.services.log_service import log_collect

logger = get_logger(__name__)


# ==================== Scheduler ====================
scheduler = BackgroundScheduler(
    timezone="UTC",
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 300,
    },
)


def run_all_collectors() -> dict:
    """
    Lance tous les collecteurs et insere les offres en base.

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

                details.append(
                    {
                        "source": source_name,
                        "status": "empty",
                        "collected": 0,
                        "inserted": 0,
                        "skipped": 0,
                    }
                )

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

            details.append(
                {
                    "source": source_name,
                    "status": "success",
                    "collected": collected,
                    "inserted": inserted,
                    "skipped": skipped,
                    "duration": round(duree, 2),
                }
            )

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

            details.append(
                {
                    "source": source_name,
                    "status": "error",
                    "error": error_msg,
                    "duration": round(duree, 2),
                }
            )

            logger.error(f"  [ERR] {source_name} : {error_msg}")

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


def cleanup_expired():
    """
    Tache de nettoyage : desactive les offres premium expirees.
    Seront implementees dans le module 14 (monetisation).
    """

    logger.info("Nettoyage des offres expirees...")
    logger.info("Nettoyage termine")


def start_scheduler():
    """
    Demarre le scheduler avec les jobs configures.
    """

    if scheduler.running:
        logger.warning("Scheduler deja en cours d'execution")
        return

    interval_hours = settings.COLLECT_INTERVAL_HOURS

    # Job 1 : collecte automatique
    scheduler.add_job(
        run_all_collectors,
        trigger=IntervalTrigger(hours=interval_hours),
        id="collect_jobs",
        name=f"Collecte automatique ({interval_hours}h)",
        replace_existing=True,
    )

    # Job 2 : nettoyage horaire
    scheduler.add_job(
        cleanup_expired,
        trigger=IntervalTrigger(hours=1),
        id="cleanup_expired",
        name="Nettoyage offres expirees (1h)",
        replace_existing=True,
    )

    # Demarrage
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
            jobs.append(
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run": (job.next_run_time.isoformat() if job.next_run_time else None),
                    "trigger": str(job.trigger),
                }
            )

    return {
        "running": scheduler.running,
        "jobs": jobs,
        "collect_interval_hours": settings.COLLECT_INTERVAL_HOURS,
    }
