"""
Purge de la base de donnees Job Africa.

Supprime les offres non-pertinentes :
    - Actualites (prefixe pays, president, gouvernement)
    - Articles de blog
    - Offres de test

Usage :
    python -m scripts.purge_database              # Simulation
    python -m scripts.purge_database --delete     # Suppression reelle
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.supabase import supabase
from app.core.logger import get_logger


logger = get_logger(__name__)

TABLE = "jobs"


CRITERES = [
    # 1. Actualites avec prefixe pays
    {"nom": "Actualites 'Ghana:'", "colonne": "titre", "operateur": "ilike", "valeur": "ghana:%"},
    {"nom": "Actualites 'Togo:'", "colonne": "titre", "operateur": "ilike", "valeur": "togo:%"},
    {"nom": "Actualites 'Senegal:'", "colonne": "titre", "operateur": "ilike", "valeur": "senegal:%"},
    {"nom": "Actualites 'Benin:'", "colonne": "titre", "operateur": "ilike", "valeur": "benin:%"},
    {"nom": "Actualites 'Nigeria:'", "colonne": "titre", "operateur": "ilike", "valeur": "nigeria:%"},
    {"nom": "Actualites 'Mali:'", "colonne": "titre", "operateur": "ilike", "valeur": "mali:%"},
    {"nom": "Actualites 'Niger:'", "colonne": "titre", "operateur": "ilike", "valeur": "niger:%"},
    {"nom": "Actualites 'Burkina:'", "colonne": "titre", "operateur": "ilike", "valeur": "burkina%:"},
    {"nom": "Actualites 'Cote d'Ivoire:'", "colonne": "titre", "operateur": "ilike", "valeur": "cote d'ivoire:%"},

    # 2. Actualites politiques
    {"nom": "Politique 'president'", "colonne": "titre", "operateur": "ilike", "valeur": "%president%"},
    {"nom": "Politique 'gouvernement'", "colonne": "titre", "operateur": "ilike", "valeur": "%gouvernement%"},
    {"nom": "Politique 'ministre'", "colonne": "titre", "operateur": "ilike", "valeur": "%ministre%"},
    {"nom": "Politique 'election'", "colonne": "titre", "operateur": "ilike", "valeur": "%election%"},

    # 3. Articles de blog
    {"nom": "Blog 'top 10'", "colonne": "titre", "operateur": "ilike", "valeur": "%top 10%"},
    {"nom": "Blog 'classement'", "colonne": "titre", "operateur": "ilike", "valeur": "%classement%"},
    {"nom": "Blog 'conseils'", "colonne": "titre", "operateur": "ilike", "valeur": "%conseils%"},
    {"nom": "Blog 'guide'", "colonne": "titre", "operateur": "ilike", "valeur": "%guide%"},
    {"nom": "Blog 'production des savoirs'", "colonne": "titre", "operateur": "ilike", "valeur": "%production des savoirs%"},
    {"nom": "Blog 'analyse du discours'", "colonne": "titre", "operateur": "ilike", "valeur": "%analyse du discours%"},

    # 4. Offres de test
    {"nom": "Test manuel", "colonne": "source", "operateur": "eq", "valeur": "Test manuel"},
]


def count_offres() -> int:
    """Compte le nombre total d'offres."""
    try:
        response = supabase.table(TABLE).select("id", count="exact").execute()
        return response.count or 0
    except Exception as e:
        logger.error(f"Erreur count : {e}")
        return 0


def find_matching_jobs(critere: dict) -> list[dict]:
    """Trouve les offres correspondant a un critere."""

    try:
        query = supabase.table(TABLE).select("id, titre, source")

        if critere["operateur"] == "ilike":
            query = query.ilike(critere["colonne"], critere["valeur"])
        elif critere["operateur"] == "eq":
            query = query.eq(critere["colonne"], critere["valeur"])

        response = query.execute()
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur recherche {critere['nom']} : {e}")
        return []


def delete_jobs(ids: list[int]) -> int:
    """Supprime un lot d'offres par leurs IDs."""

    if not ids:
        return 0

    try:
        response = (
            supabase.table(TABLE)
            .delete()
            .in_("id", list(ids))
            .execute()
        )
        return len(response.data or [])
    except Exception as e:
        logger.error(f"Erreur suppression : {e}")
        return 0


def main():
    delete_mode = "--delete" in sys.argv

    print("=" * 70)
    print("PURGE DE LA BASE JOB AFRICA")
    print("=" * 70)
    print()

    if delete_mode:
        print("MODE : SUPPRESSION REELLE")
    else:
        print("MODE : SIMULATION (ajouter --delete pour supprimer)")
    print()

    # ==================== COMPTAGE AVANT ====================
    total_avant = count_offres()
    print(f"Total offres AVANT : {total_avant}")
    print()

    # ==================== RECHERCHE ====================
    ids_a_supprimer = set()
    total_par_critere = {}

    print("=" * 70)
    print("CRITERES DE SUPPRESSION")
    print("=" * 70)
    print()

    for critere in CRITERES:
        jobs = find_matching_jobs(critere)
        total_par_critere[critere["nom"]] = len(jobs)

        if jobs:
            print(f"  {critere['nom']} : {len(jobs)} offre(s)")

            for job in jobs[:2]:
                titre = job.get("titre", "")[:70]
                print(f"    - {titre}")

            if len(jobs) > 2:
                print(f"    ... et {len(jobs) - 2} autres")

            print()

            for job in jobs:
                ids_a_supprimer.add(job["id"])
        else:
            print(f"  {critere['nom']} : 0 offre")

    # ==================== RESUME ====================
    print()
    print("=" * 70)
    print("RESUME")
    print("=" * 70)
    print()
    print(f"  Total a supprimer : {len(ids_a_supprimer)}")
    print(f"  Total restant     : {total_avant - len(ids_a_supprimer)}")
    print()

    # ==================== SUPPRESSION ====================
    if delete_mode and ids_a_supprimer:
        print("=" * 70)
        print("SUPPRESSION EN COURS")
        print("=" * 70)
        print()

        ids_list = list(ids_a_supprimer)
        batch_size = 50
        total_supprime = 0

        for i in range(0, len(ids_list), batch_size):
            batch = ids_list[i:i + batch_size]
            supprime = delete_jobs(batch)
            total_supprime += supprime
            print(f"    {min(i + batch_size, len(ids_list))}/{len(ids_list)} supprimees...")

        print()
        print(f"  OK {total_supprime} offres supprimees")
        print()

        # ==================== COMPTAGE APRES ====================
        total_apres = count_offres()
        print(f"  Total offres APRES : {total_apres}")
        print()

    elif delete_mode and not ids_a_supprimer:
        print("Aucune offre a supprimer.")

    else:
        print("Pour supprimer ces offres, relancez avec :")
        print("  python -m scripts.purge_database --delete")

    print()
    print("=" * 70)


if __name__ == "__main__":
    main()
