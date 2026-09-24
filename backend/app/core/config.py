"""
Configuration centralisée de l'application.

Utilise Pydantic Settings pour charger les variables
depuis le fichier .env avec validation automatique.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuration de l'application Job Africa.

    Les variables sont lues depuis :
    1. Variables d'environnement système
    2. Fichier .env (priorité basse)
    """

    # ==================== SUPABASE ====================
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcW1obHd0dnRpeGF5eXN0c3l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY1ODY5OSwiZXhwIjoyMTA1MjM0Njk5fQ.6QVdYIDpoPZ4jGdmjYitABeAGhKvyrab8-3lniunARw"

    # ==================== APP ====================
    APP_NAME: str = "Job Africa API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ==================== COLLECTE ====================
    COLLECT_INTERVAL_HOURS: int = 6
    REQUEST_TIMEOUT: int = 15
    MAX_JOBS_PER_SOURCE: int = 200

    # ==================== LOGS ====================
    LOG_LEVEL: str = "INFO"

    # ==================== CONFIG ====================
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# ==================== Instance globale ====================
settings = Settings()
