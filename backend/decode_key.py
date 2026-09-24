"""
Décode le rôle de la clé Supabase.

Usage :
    python decode_key.py
"""

import base64
import json
import os

from dotenv import load_dotenv


load_dotenv()

key = os.getenv("SUPABASE_SERVICE_KEY", "")

print("=" * 60)
print("🔍 DÉCODAGE DE LA CLÉ SUPABASE_SERVICE_KEY")
print("=" * 60)
print()
print(f"Longueur : {len(key)}")
print(f"Début    : {key[:60]}...")
print()

if not key:
    print("❌ Aucune clé trouvée dans .env")
    exit(1)

try:
    # Décode le payload JWT
    parts = key.split(".")

    if len(parts) != 3:
        print(f"❌ Format invalide (attendu 3 parties, reçu {len(parts)})")
        exit(1)

    payload_b64 = parts[1]
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    data = json.loads(base64.urlsafe_b64decode(payload_b64))

    print("=== CONTENU DU JWT ===")
    print(f"Rôle    : {data.get('role', 'INCONNU')}")
    print(f"Issuer  : {data.get('iss', 'INCONNU')}")
    print(f"Ref     : {data.get('ref', 'INCONNU')}")
    print()

    if data.get("role") == "anon":
        print("❌ C'est la clé ANON (publique)")
        print()
        print("→ Il faut copier la clé SERVICE_ROLE depuis Supabase")
        print("→ URL : https://supabase.com/dashboard/project/gqqmhlwtvtixayystsyw/settings/api-keys")
    elif data.get("role") == "service_role":
        print("✅ C'est la clé SERVICE_ROLE (correcte)")
        print()
        print("→ Tu peux continuer")
    else:
        print(f"⚠️  Rôle inconnu : {data.get('role')}")

except Exception as e:
    print(f"❌ Erreur décodage : {e}")