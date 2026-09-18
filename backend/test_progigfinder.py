import httpx
import json


url = "https://www.progigfinder.com/api/feed/jobs?format=json"

print(f"Test de {url}")
print("=" * 70)

r = httpx.get(url, timeout=15)

print(f"Status : {r.status_code}")
print(f"Content-Type : {r.headers.get('content-type')}")
print(f"Taille : {len(r.text)} caractères")
print()

# Affiche les 2000 premiers caractères
print("=== Début du contenu ===")
print(r.text[:2000])
print("...")
print()

# Essaie de parser en JSON
try:
    data = r.json()

    print("=== JSON parsé avec succès ===")
    print(f"Type racine : {type(data)}")

    if isinstance(data, dict):
        print(f"Clés : {list(data.keys())}")

        for key, value in data.items():
            if isinstance(value, list):
                print(f"  {key} : list de {len(value)} éléments")
                if value:
                    print(f"  Exemple : {json.dumps(value[0], indent=2)[:500]}")
            else:
                print(f"  {key} : {type(value).__name__}")

    elif isinstance(data, list):
        print(f"Liste de {len(data)} éléments")
        if data:
            print(f"Exemple : {json.dumps(data[0], indent=2)[:500]}")

except Exception as e:
    print(f"❌ Erreur parsing JSON : {e}")