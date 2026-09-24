"""
Confirme manuellement une transaction (mode test).

⚠️ Utilise le client admin (service_role) pour bypasser RLS.

Usage :
    python -m scripts.confirm_transaction JA-2026-9B60627D
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.payment_service import confirm_transaction


def main():
    if len(sys.argv) < 2:
        print("Usage : python -m scripts.confirm_transaction <reference>")
        sys.exit(1)

    reference = sys.argv[1]

    print(f"Confirmation de la transaction {reference}...")
    print()

    result = confirm_transaction(reference, use_admin=True)

    if result:
        print(f"✅ Transaction confirmee !")
        print(f"   Type    : {result.get('type')}")
        print(f"   Montant : {result.get('montant')} XOF")
        print(f"   Statut  : {result.get('statut')}")
        print(f"   Payee a : {result.get('paid_at')}")
    else:
        print(f"❌ Transaction introuvable ou erreur")
        print()
        print("Verifie que :")
        print("  1. La reference est correcte")
        print("  2. SUPABASE_SERVICE_KEY est dans .env")
        print("  3. La transaction existe dans Supabase")


if __name__ == "__main__":
    main()