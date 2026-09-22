"""
Script CLI de nettoyage et enrichissement de la base.

Usage :
    python -m scripts.clean_database find       # Trouver les doublons
    python -m scripts.clean_database clean      # Supprimer les doublons
    python -m scripts.clean_database enrich     # Enrichir les offres
    python -m scripts.clean_database all        # Tout faire
"""

import sys
from pathlib import Path

# Ajoute le dossier backend au PYTHONPATH
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.cleanup_service import (
    clean_duplicates,
    enrich_existing_jobs,
    find_duplicates,
)


def cmd_find():
    print("Recherche des doublons...")
    print()

    duplicates = find_duplicates()

    if not duplicates:
        print("Aucun doublon trouve !")
        return

    print(f"{len(duplicates)} doublon(s) trouve(s)")
    print()
    print("Premiers doublons (keep_id -> delete_id) :")

    for k, d in duplicates[:10]:
        print(f"  #{k}  <-  #{d}")

    if len(duplicates) > 10:
        print(f"  ... et {len(duplicates) - 10} autres")


def cmd_clean():
    print("Nettoyage des doublons...")
    print()

    result = clean_duplicates(dry_run=False)

    print(f"Doublons trouves : {result['duplicates_found']}")
    print(f"Supprimes        : {result['deleted']}")


def cmd_enrich():
    print("Enrichissement des offres...")
    print()

    result = enrich_existing_jobs()

    print(f"Traitees : {result['processed']}")
    print(f"Enrichies : {result['updated']}")


def cmd_all():
    print("=== NETTOYAGE COMPLET ===")
    print()

    print("1. Recherche des doublons...")
    duplicates = find_duplicates()
    print(f"   {len(duplicates)} doublon(s) trouve(s)")
    print()

    if duplicates:
        print("2. Suppression des doublons...")
        result = clean_duplicates(dry_run=False)
        print(f"   {result['deleted']} supprime(s)")
    else:
        print("2. Aucun doublon a supprimer")
    print()

    print("3. Enrichissement des offres...")
    result = enrich_existing_jobs()
    print(f"   {result['updated']} enrichie(s) sur {result['processed']}")
    print()

    print("=== TERMINE ===")


def main():
    if len(sys.argv) < 2:
        print("Usage : python -m scripts.clean_database <command>")
        print()
        print("Commandes disponibles :")
        print("  find     Trouver les doublons")
        print("  clean    Supprimer les doublons")
        print("  enrich   Enrichir les offres")
        print("  all      Tout faire")
        return

    cmd = sys.argv[1].lower()

    if cmd == "find":
        cmd_find()
    elif cmd == "clean":
        cmd_clean()
    elif cmd == "enrich":
        cmd_enrich()
    elif cmd == "all":
        cmd_all()
    else:
        print(f"Commande inconnue : {cmd}")
        print("Utilisez : find, clean, enrich, all")


if __name__ == "__main__":
    main()
