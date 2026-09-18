"""
Logger structuré pour Job Africa.

Fournit get_logger(name) qui retourne un logger configuré
avec un format uniforme.
"""

import logging
import sys

from app.core.config import settings


# ==================== Cache des loggers ====================
_loggers: dict[str, logging.Logger] = {}


def get_logger(name: str) -> logging.Logger:
    """
    Retourne un logger configuré.

    Les loggers sont mis en cache pour éviter la duplication
    des handlers.

    Args:
        name: Nom du logger (généralement __name__)

    Returns:
        Logger configuré
    """

    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(name)

    # Évite les handlers en double
    if logger.handlers:
        _loggers[name] = logger
        return logger

    # ==================== Niveau ====================
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    # ==================== Handler ====================
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    # ==================== Format ====================
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # ==================== Ajout ====================
    logger.addHandler(handler)
    logger.propagate = False

    _loggers[name] = logger
    return logger
