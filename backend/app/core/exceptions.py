"""
Exceptions métier de Job Africa.

Hiérarchie :
    JobAfricaError
    ├── CollectorError
    ├── NormalizationError
    ├── StorageError
    └── ValidationError
"""


class JobAfricaError(Exception):
    """Exception de base du projet Job Africa."""
    pass


class CollectorError(JobAfricaError):
    """Erreur lors de la collecte d'offres."""
    pass


class NormalizationError(JobAfricaError):
    """Erreur lors de la normalisation des données."""
    pass


class StorageError(JobAfricaError):
    """Erreur lors du stockage en base."""
    pass


class ValidationError(JobAfricaError):
    """Erreur de validation des données."""
    pass


class ConfigurationError(JobAfricaError):
    """Erreur de configuration."""
    pass
