"""
Client Supabase partagé.
"""

from app.core.config import settings
from app.core.logger import get_logger
from supabase import Client, create_client

logger = get_logger(__name__)


def _create_supabase_client() -> Client:
    """Crée le client Supabase avec gestion d'erreur."""

    logger.info(f"SUPABASE_URL: {settings.SUPABASE_URL}")
    logger.info(f"SUPABASE_KEY length: {len(settings.SUPABASE_KEY)}")

    try:
        client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
        )
        logger.info("Client Supabase initialisé")
        return client

    except Exception as e:
        logger.error(f"Erreur initialisation Supabase : {e}")
        raise


# ==================== Client global ====================
supabase: Client = _create_supabase_client()
