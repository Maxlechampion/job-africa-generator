"""
Configuration pytest partagée.
"""

import os
import sys
from pathlib import Path


# Ajoute le dossier backend au PYTHONPATH
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


# Variables d'environnement de test (valeurs factices)
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test_key_for_testing_only")
os.environ.setdefault("LOG_LEVEL", "WARNING")
