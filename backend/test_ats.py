"""
Test de slugs ATS pour entreprises africaines.

Usage :
    python test_ats.py
"""

import httpx
import time


SLUGS = [
    # Fintechs africaines (2e vague)
    "teamapt", "paylater", "creditclan", "vbank",
    "sparkle", "onefinance", "cowrywise", "risevest",
    "chipper", "trove-finance", "mercury-africa",

    # Néobanques / Banques digitales
    "kuda", "vfd", "rubies", "eyowo", "alat",
    "aladdin", "fintech-africa", "sycamore",

    # E-commerce / Marketplaces
    "kongapay", "jiji", "jumia-pay", "kikuu",
    "afrikart", "kilimall", "jiji-africa",

    # Logistique / Transport
    "sendbox", "gokada", "max-ng", "lori",
    "kobo360", "sendif", "fenix-intl",

    # Santé / MedTech
    "clafiya", "reliance-hmo", "lifebank",
    "drugstoc", "mdaas", "helium-health",

    # Éducation / EdTech
    "ulesson", "edves", "tuteria", "schoolable",

    # AgTech / FoodTech
    "farmcrowdy", "thrive-agric", "releaf",
    "agrocenta", "twiga-foods", "copia",

    # ONG / Impact (Afrique)
    "pathfinder-international", "amref-health-africa",
    "acuity-insurance", "living-goods",
    "give-directly", "evidence-action",
    "clinton-health-access-initiative",
    "chai-africa", "village-enterprise",
    "technoserve", "one-acre-fund",

    # Énergie solaire
    "dlight", "angsolar", "solar-kiosk",
    "zola-electric", "off-grid-electric",
    "fenix-international", "bboxx",
    "peg-africa", "daystar-power",
]


def test_greenhouse(slug: str):
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
    try:
        r = httpx.get(url, timeout=8)
        if r.status_code == 200:
            count = len(r.json().get("jobs", []))
            if count > 0:
                print(f"  ✅ GREENHOUSE : {slug:25s} → {count} offres")
                return (slug, "greenhouse", count)
    except Exception:
        pass
    return None


def test_ashby(slug: str):
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
    try:
        r = httpx.get(url, timeout=8)
        if r.status_code == 200:
            count = len(r.json().get("jobs", []))
            if count > 0:
                print(f"  ✅ ASHBY      : {slug:25s} → {count} offres")
                return (slug, "ashby", count)
    except Exception:
        pass
    return None


def main():
    print("=" * 70)
    print("🔍 TEST DES SLUGS ATS AFRICAINS")
    print("=" * 70)
    print()

    results = []

    for slug in SLUGS:
        print(f"🔎 Test : {slug}")

        gh = test_greenhouse(slug)
        if gh:
            results.append(gh)
            time.sleep(0.3)
            continue

        ash = test_ashby(slug)
        if ash:
            results.append(ash)

        time.sleep(0.3)

    print()
    print("=" * 70)
    print(f"✅ {len(results)} ATS valides trouvés")
    print("=" * 70)

    for slug, ats, count in results:
        print(f"  {ats:12s} | {slug:25s} | {count} offres")


if __name__ == "__main__":
    main()