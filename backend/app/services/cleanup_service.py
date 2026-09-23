"""
Service de nettoyage de la base de donnees.

Fonctionnalites :
    - Detecter les doublons existants dans Supabase
    - Supprimer les doublons en gardant l'offre la plus ancienne
    - Enrichir les offres existantes (categorisation)
"""

from app.core.logger import get_logger
from app.core.supabase import supabase
from app.services.categorizer import enrich_job
from app.services.deduplicator import is_duplicate

logger = get_logger(__name__)

TABLE = "jobs"


def fetch_all_jobs(limit: int = 5000) -> list[dict]:
    """Recupere toutes les offres de la base."""

    try:
        response = (
            supabase.table(TABLE).select("*").order("created_at", desc=False).limit(limit).execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur fetch_all_jobs : {e}")
        return []


def find_duplicates() -> list[tuple[int, int]]:
    """
    Trouve les paires de doublons.

    Returns:
        Liste de tuples (id_a_garder, id_a_supprimer)
    """

    jobs = fetch_all_jobs()

    if not jobs:
        logger.info("Aucune offre en base")
        return []

    logger.info(f"Analyse de {len(jobs)} offres...")

    uniques = []
    duplicates = []

    for job in jobs:
        is_dup = False

        for existing in uniques:
            if is_duplicate(job, existing):
                # Le nouveau job est un doublon de l'existing
                # On garde l'existing (plus ancien) et on supprime le nouveau
                duplicates.append((existing["id"], job["id"]))
                is_dup = True
                break

        if not is_dup:
            uniques.append(job)

    logger.info(f"{len(duplicates)} doublon(s) trouve(s) ({len(uniques)} uniques sur {len(jobs)})")

    return duplicates


def delete_jobs_by_ids(job_ids: list[int]) -> int:
    """
    Supprime des offres par leurs IDs.

    Supabase a une limite sur les clauses 'in' (~100 éléments),
    donc on découpe en lots de 50.
    """

    if not job_ids:
        return 0

    deleted = 0
    batch_size = 50

    for i in range(0, len(job_ids), batch_size):
        batch = job_ids[i : i + batch_size]

        try:
            # Supabase retourne les lignes supprimées avec .select() après delete
            # Mais le plus fiable : compter les IDs qu'on envoie
            supabase.table(TABLE).delete().in_("id", batch).execute()
            deleted += len(batch)
            logger.info(f"Lot supprimé : {len(batch)} offres")

        except Exception as e:
            logger.error(f"Erreur suppression lot {i} : {e}")

    logger.info(f"Total supprimé : {deleted} offre(s)")
    return deleted


def clean_duplicates(dry_run: bool = False) -> dict:
    """
    Nettoie les doublons de la base.

    Args:
        dry_run : Si True, ne supprime rien, retourne juste les stats

    Returns:
        Statistiques du nettoyage
    """

    duplicates = find_duplicates()

    if not duplicates:
        return {
            "duplicates_found": 0,
            "deleted": 0,
            "dry_run": dry_run,
        }

    ids_to_delete = [dup[1] for dup in duplicates]

    if dry_run:
        logger.info(f"[DRY-RUN] Supprimerait {len(ids_to_delete)} offres")
        return {
            "duplicates_found": len(duplicates),
            "deleted": 0,
            "dry_run": True,
            "ids_to_delete": ids_to_delete[:20],
        }

    deleted = delete_jobs_by_ids(ids_to_delete)

    return {
        "duplicates_found": len(duplicates),
        "deleted": deleted,
        "dry_run": False,
    }


def enrich_existing_jobs(limit: int = 5000) -> dict:
    """
    Enrichit les offres existantes avec :
        - categorie
        - type_contrat
        - niveau
        - teletravail
    """

    jobs = fetch_all_jobs(limit)

    if not jobs:
        return {"processed": 0, "updated": 0}

    logger.info(f"Enrichissement de {len(jobs)} offres...")

    updated = 0

    for job in jobs:
        job_id = job.get("id")

        # Sauvegarde les valeurs actuelles
        old_cat = job.get("categorie")
        old_contrat = job.get("type_contrat")
        old_niveau = job.get("niveau")
        old_tt = job.get("teletravail")

        # Enrichit
        enriched = enrich_job(dict(job))

        # Detecte les changements
        changes = {}

        if not old_cat and enriched.get("categorie"):
            changes["categorie"] = enriched["categorie"]

        if not old_contrat and enriched.get("type_contrat"):
            changes["type_contrat"] = enriched["type_contrat"]

        if not old_niveau and enriched.get("niveau"):
            changes["niveau"] = enriched["niveau"]

        if old_tt is False and enriched.get("teletravail") is True:
            changes["teletravail"] = True

        if changes:
            try:
                supabase.table(TABLE).update(changes).eq("id", job_id).execute()
                updated += 1
            except Exception as e:
                logger.error(f"Erreur update #{job_id} : {e}")

    logger.info(f"{updated} offre(s) enrichie(s)")

    return {
        "processed": len(jobs),
        "updated": updated,
    }
