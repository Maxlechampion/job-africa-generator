"""
Client Supabase admin (service_role).

⚠️ Ce client BYPASSE le RLS.
À utiliser UNIQUEMENT pour les scripts d'administration et de test.
NE JAMAIS exposer ce client au frontend.
"""
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client

from app.core.config import settings
from app.core.logger import get_logger


logger = get_logger(__name__)


def get_admin_client() -> Client | None:
    """Retourne un client Supabase avec les droits service_role."""

    if not settings.SUPABASE_SERVICE_KEY:
        logger.warning(
            "SUPABASE_SERVICE_KEY manquante — le client admin ne peut pas être créé"
        )
        return None

    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
    )