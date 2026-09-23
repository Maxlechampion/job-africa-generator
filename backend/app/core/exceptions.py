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


class CollectorError(JobAfricaError):
    """Erreur lors de la collecte d'offres."""


class NormalizationError(JobAfricaError):
    """Erreur lors de la normalisation des données."""


class StorageError(JobAfricaError):
    """Erreur lors du stockage en base."""


class ValidationError(JobAfricaError):
    """Erreur de validation des données."""


class ConfigurationError(JobAfricaError):
    """Erreur de configuration."""
