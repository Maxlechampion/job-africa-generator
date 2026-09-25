"""
Test du filtre v3.

Usage :
    python -m scripts.test_filter
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.relevance_filter import filter_relevant_jobs, is_relevant_job


TEST_JOBS = [
    {
        "titre": "Developpeur Python Junior",
        "description": "Nous recherchons un developpeur Python. CDI, Cotonou. Envoyez votre CV.",
        "url": "https://exemple.bj/jobs/1",
    },
    {
        "titre": "Conseils Reunis recrute-05/10/2026",
        "description": "Conseils Reunis recrute pour plusieurs postes. Profil recherche : 3 ans d'experience. Date limite : 05/10/2026.",
        "url": "https://emploitogo.info/recrute-05-10-2026",
    },
    {
        "titre": "Top 10 des metiers qui recrutent en 2026",
        "description": "Decouvrez notre classement des metiers. Conseils et guide.",
        "url": "https://blog.exemple.com/top-10",
    },
    {
        "titre": "Ghana: Le president autorise le recrutement de 1200 agents antidrogue",
        "description": "Le president du Ghana a autorise le recrutement apres la saisie de cocaine.",
        "url": "https://allafrica.com/ghana-1200-agents",
    },
    {
        "titre": "Production des savoirs sur le continent - Des chercheurs africains repensent l'analyse du discours",
        "description": "Une etude menee par des chercheurs africains sur l'analyse du discours.",
        "url": "https://blog.exemple.com/production-savoirs",
    },
]


def main():
    print("=" * 70)
    print("TEST DU FILTRE v3")
    print("=" * 70)
    print()

    filtered, stats = filter_relevant_jobs(TEST_JOBS)

    print(f"Total    : {stats['total']}")
    print(f"Gardees  : {stats['kept']}")
    print(f"Rejetees : {stats['rejected']}")
    print()

    print("Raisons des rejets :")
    for reason, count in stats["reasons"].items():
        if count > 0:
            print(f"  - {reason} : {count}")

    print()
    print("Offres gardees :")
    for job in filtered:
        print(f"  OK {job['titre'][:70]}")

    print()
    print("Offres rejetees :")
    for job in TEST_JOBS:
        is_ok, details = is_relevant_job(job)
        if not is_ok:
            print(f"  REJET : {job['titre'][:60]}")
            print(f"          Score: {details['score']}")


if __name__ == "__main__":
    main()