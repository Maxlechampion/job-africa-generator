"""
Script CLI pour lancer une collecte manuellement.

Usage :
    python -m scripts.run_collect
"""

import sys
from pathlib import Path

# Ajoute le dossier backend au PYTHONPATH
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.scheduler import run_all_collectors


def main():
    print("=" * 60)
    print("Job Africa - Collecte manuelle")
    print("=" * 60)
    print()

    result = run_all_collectors()

    print()
    print("=" * 60)
    print("RESULTAT")
    print("=" * 60)
    print()
    print(f"  Total collectees : {result['total_collected']}")
    print(f"  Total inserees   : {result['total_inserted']}")
    print(f"  Total ignorees   : {result['total_skipped']}")
    print(f"  Total erreurs    : {result['total_errors']}")
    print(f"  Duree totale     : {result['total_duration']}s")
    print()
    print("  Details par source :")
    print("  " + "-" * 56)

    for d in result["details"]:
        status = d.get("status", "?")
        name = d.get("source", "?")[:25].ljust(25)

        if status == "success":
            info = (
                f"{d['collected']:>3} collectees, "
                f"{d['inserted']:>3} inserees, "
                f"{d['skipped']:>3} ignorees"
            )
            icon = "[OK]"
        elif status == "error":
            info = f"ERREUR : {d.get('error', '')[:40]}"
            icon = "[ERR]"
        else:
            info = "aucune offre"
            icon = "[SKIP]"

        print(f"  {icon} {name} {info}")

    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
