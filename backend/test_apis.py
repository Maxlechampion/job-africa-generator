import httpx

# Test Fuzu
print("=== FUZU ===")
try:
    r = httpx.get("https://www.fuzu.com/api/all_jobs", timeout=15)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        jobs = data.get("fuzu_api", [])
        print(f"Offres : {len(jobs)}")
        if jobs:
            print(f"Exemple : {jobs[0].get('title')} - {jobs[0].get('employer_name')}")
except Exception as e:
    print(f"Erreur : {e}")

# Test ProGigFinder
print("\n=== PROGIGFINDER ===")
try:
    r = httpx.get("https://www.progigfinder.com/api/feed/jobs?format=json", timeout=15)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Offres : {len(data) if isinstance(data, list) else 'format inconnu'}")
except Exception as e:
    print(f"Erreur : {e}")