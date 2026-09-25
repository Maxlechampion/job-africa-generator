"""
Test complet : normalisation + filtre.

Usage :
    python -m scripts.test_full_filter
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.normalizer import normalize_job
from app.services.relevance_filter import filter_relevant_jobs


TEST_JOBS = [
    {
        "titre": "Ghana: Le pr&eacute;sident autorise le recrutement de 1200 agents antidrogue apr&egrave;s la saisie de 3,9 tonnes de coca&iuml;ne",
        "description": "Le president du Ghana a autorise le recrutement.",
        "url": "https://allafrica.com/ghana-1200-agents",
        "source": "AllAfrica",
    },
    {
        "titre": "Conseils Reunis recrute-05/10/2026",
        "description": "Conseils Reunis recrute pour plusieurs postes. Profil recherche. Date limite : 05/10/2026.",
        "url": "https://emploitogo.info/recrute-05-10-2026",
        "source": "Emploi Togo",
    },
]


def main():
    print("=" * 70)
    print("TEST COMPLET : NORMALISATION + FILTRE")
    print("=" * 70)
    print()

    # Etape 1 : Normalisation (decode HTML)
    print("1. NORMALISATION")
    print("-" * 70)
    normalized = []
    for job in TEST_JOBS:
        n = normalize_job(job)
        normalized.append(n)
        print(f"  AVANT : {job['titre'][:60]}")
        print(f"  APRES : {n['titre'][:60]}")
        print()

    # Etape 2 : Filtre (avec titres normalises)
    print("2. FILTRE")
    print("-" * 70)
    filtered, stats = filter_relevant_jobs(normalized)

    print(f"  Total    : {stats['total']}")
    print(f"  Gardees  : {stats['kept']}")
    print(f"  Rejetees : {stats['rejected']}")
    print()
    print(f"  Raisons : {stats['reasons']}")
    print()

    print("Offres gardees :")
    for job in filtered:
        print(f"  OK {job['titre'][:60]}")


if __name__ == "__main__":
    main()