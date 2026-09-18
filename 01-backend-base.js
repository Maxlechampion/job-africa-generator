#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 *  MODULE 01 — BACKEND BASE (FastAPI)
 * ═══════════════════════════════════════════════════════════════
 *
 * Crée le backend FastAPI de base pour Job Africa :
 *   - Configuration centralisée (Pydantic Settings)
 *   - Client Supabase
 *   - Logger structuré
 *   - Exceptions métier
 *   - Schémas Pydantic (Job)
 *   - Services (normalizer, job_service)
 *   - Routes API (jobs, stats)
 *   - Fichiers de configuration (requirements.txt, .env, Dockerfile)
 *   - Tests unitaires (pytest)
 *
 * USAGE :
 *   node 01-backend-base.js [options]
 *
 * OPTIONS :
 *   --force          Réinstalle (écrase les fichiers, backup auto)
 *   --dry-run        Simule sans écrire sur le disque
 *   --skip-existing  Ignore les fichiers déjà présents
 *   --uninstall      Désinstalle le module
 *   --verbose        Affiche plus de détails
 *
 * EXEMPLES :
 *   node 01-backend-base.js
 *   node 01-backend-base.js --dry-run
 *   node 01-backend-base.js --force
 *   node 01-backend-base.js --uninstall
 *
 * PRÉREQUIS :
 *   - Module 00 (architecture) installé
 *     Vérifie la présence de : backend/app, frontend/src, supabase
 *
 * DÉPENDANCES :
 *   - chalk
 *   - _lib/fs-utils.js
 *   - _lib/logger.js
 *   - _lib/registry.js
 *   - _lib/validator.js
 *
 * FICHIERS CRÉÉS (19) :
 *   backend/requirements.txt
 *   backend/.env.example
 *   backend/.env                    (vide, à remplir)
 *   backend/Dockerfile
 *   backend/docker-compose.yml
 *   backend/pytest.ini
 *
 *   backend/app/__init__.py
 *   backend/app/main.py
 *
 *   backend/app/core/__init__.py
 *   backend/app/core/config.py
 *   backend/app/core/logger.py
 *   backend/app/core/exceptions.py
 *   backend/app/core/supabase.py
 *
 *   backend/app/schemas/__init__.py
 *   backend/app/schemas/job.py
 *
 *   backend/app/services/__init__.py
 *   backend/app/services/normalizer.py
 *   backend/app/services/job_service.py
 *
 *   backend/app/api/__init__.py
 *   backend/app/api/jobs.py
 *   backend/app/api/stats.py
 *
 *   backend/tests/__init__.py
 *   backend/tests/test_api.py
 *   backend/tests/test_normalizer.py
 *   backend/tests/conftest.py
 *
 * ÉTAT ENREGISTRÉ :
 *   _state/installed.json → {modules: {"01": {...}}}
 *
 * ROLLBACK :
 *   node 01-backend-base.js --uninstall
 *   (supprime tous les fichiers du module 01)
 *
 * APRÈS INSTALLATION :
 *   cd backend
 *   python -m venv venv
 *   venv\Scripts\activate        (Windows)
 *   source venv/bin/activate     (Linux/Mac)
 *   pip install -r requirements.txt
 *   cp .env.example .env         (puis remplir SUPABASE_URL et SUPABASE_KEY)
 *   uvicorn app.main:app --reload
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { writeFiles, removeFile, exists } from "./_lib/fs-utils.js";
import { log } from "./_lib/logger.js";
import {
  markInstalled,
  markUninstalled,
  isInstalled,
} from "./_lib/registry.js";
import { validateRequirements } from "./_lib/validator.js";

// ==================== Parse des arguments CLI ====================
const args = process.argv.slice(2);
const OPTIONS = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  skipExisting: args.includes("--skip-existing"),
  uninstall: args.includes("--uninstall"),
  verbose: args.includes("--verbose"),
};

// ==================== Constantes du module ====================
const MODULE_ID = "01";
const MODULE_NAME = "Backend Base";
const MODULE_VERSION = "1.0.0";

// ==================== Prérequis ====================
// Ce module nécessite que l'architecture (module 00) soit installée
const REQUIREMENTS = [
  "backend/app",
  "backend/app/core",
  "backend/app/schemas",
  "backend/app/services",
  "backend/app/api",
  "backend/tests",
  "frontend/src",
  "supabase",
];

// ==================== Fichiers du module ====================
const FILES = {
  // ═══════════════════════════════════════════════════════════════
  // 1. requirements.txt
  // ═══════════════════════════════════════════════════════════════
  "backend/requirements.txt": `
fastapi==0.115.0
uvicorn[standard]==0.32.0
supabase==2.9.1
python-dotenv==1.0.1
pydantic==2.9.2
pydantic-settings==2.5.2
httpx==0.27.2
feedparser==6.0.11
beautifulsoup4==4.12.3
lxml==5.3.0
apscheduler==3.10.4
tenacity==9.0.0
python-slugify==8.0.4
rapidfuzz==3.10.0
pytest==8.3.3
pytest-asyncio==0.24.0
pytest-cov==6.0.0
`,

  // ═══════════════════════════════════════════════════════════════
  // 2. .env.example
  // ═══════════════════════════════════════════════════════════════
  "backend/.env.example": `
# ==================== SUPABASE ====================
# Créer un projet sur https://supabase.com
# Puis copier les valeurs depuis Settings > API
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxx

# ==================== APP ====================
APP_NAME=Job Africa API
APP_VERSION=1.0.0
DEBUG=false
LOG_LEVEL=INFO

# ==================== COLLECTE ====================
COLLECT_INTERVAL_HOURS=6
REQUEST_TIMEOUT=15
MAX_JOBS_PER_SOURCE=200
`,

  // ═══════════════════════════════════════════════════════════════
  // 3. .env (vide, à remplir)
  // ═══════════════════════════════════════════════════════════════
  "backend/.env": `
# ⚠️ Ce fichier contient des secrets — NE PAS COMMITER
# Remplir les valeurs ci-dessous

SUPABASE_URL=
SUPABASE_KEY=

DEBUG=false
LOG_LEVEL=INFO
COLLECT_INTERVAL_HOURS=6
`,

  // ═══════════════════════════════════════════════════════════════
  // 4. Dockerfile
  // ═══════════════════════════════════════════════════════════════
  "backend/Dockerfile": `
# ==================== Image de base ====================
FROM python:3.12-slim

# ==================== Métadonnées ====================
LABEL maintainer="Job Africa <contact@jobafrica.app>"
LABEL description="Backend FastAPI de Job Africa"

# ==================== Variables d'environnement ====================
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    PIP_NO_CACHE_DIR=1 \\
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ==================== Répertoire de travail ====================
WORKDIR /app

# ==================== Dépendances système ====================
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc \\
    g++ \\
    libxml2-dev \\
    libxslt1-dev \\
    && rm -rf /var/lib/apt/lists/*

# ==================== Dépendances Python ====================
COPY requirements.txt .
RUN pip install --upgrade pip && \\
    pip install -r requirements.txt

# ==================== Code source ====================
COPY . .

# ==================== Utilisateur non-root ====================
RUN useradd -m -u 1000 appuser && \\
    chown -R appuser:appuser /app
USER appuser

# ==================== Port ====================
EXPOSE 8000

# ==================== Health check ====================
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# ==================== Commande par défaut ====================
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,

  // ═══════════════════════════════════════════════════════════════
  // 5. docker-compose.yml
  // ═══════════════════════════════════════════════════════════════
  "backend/docker-compose.yml": `
version: "3.9"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: job_africa_api
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    volumes:
      - ./app:/app/app:ro
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`,

  // ═══════════════════════════════════════════════════════════════
  // 6. pytest.ini
  // ═══════════════════════════════════════════════════════════════
  "backend/pytest.ini": `
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --color=yes
    -ra
markers =
    unit: Tests unitaires rapides
    integration: Tests d'intégration (nécessitent Supabase)
    slow: Tests lents
`,

  // ═══════════════════════════════════════════════════════════════
  // 7. app/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/__init__.py": `
"""
Job Africa — Backend FastAPI

Agrégateur intelligent d'offres d'emploi en Afrique de l'Ouest.
"""

__version__ = "1.0.0"
`,

  // ═══════════════════════════════════════════════════════════════
  // 8. app/core/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/core/__init__.py": `
"""Configuration, logger, Supabase, exceptions."""
`,

  // ═══════════════════════════════════════════════════════════════
  // 9. app/core/config.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/core/config.py": `
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
`,

  // ═══════════════════════════════════════════════════════════════
  // 10. app/core/logger.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/core/logger.py": `
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
`,

  // ═══════════════════════════════════════════════════════════════
  // 11. app/core/exceptions.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/core/exceptions.py": `
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
`,

  // ═══════════════════════════════════════════════════════════════
  // 12. app/core/supabase.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/core/supabase.py": `
"""
Client Supabase partagé.

Un seul client est créé et réutilisé dans toute l'application
pour éviter les connexions multiples.
"""

from supabase import create_client, Client

from app.core.config import settings
from app.core.logger import get_logger


logger = get_logger(__name__)


def _create_supabase_client() -> Client:
    """Crée le client Supabase avec gestion d'erreur."""

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
`,

  // ═══════════════════════════════════════════════════════════════
  // 13. app/schemas/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/schemas/__init__.py": `
"""Schémas Pydantic de validation."""
`,

  // ═══════════════════════════════════════════════════════════════
  // 14. app/schemas/job.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/schemas/job.py": `
"""
Schémas Pydantic pour les offres d'emploi.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl, field_validator


class JobCreate(BaseModel):
    """
    Schéma pour la création d'une offre.

    Utilisé par POST /jobs.
    """

    titre: str = Field(..., min_length=1, max_length=300)
    entreprise: Optional[str] = Field(None, max_length=200)
    pays: Optional[str] = Field(None, max_length=100)
    ville: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    type_contrat: Optional[str] = Field(None, max_length=50)
    niveau: Optional[str] = Field(None, max_length=50)
    categorie: Optional[str] = Field(None, max_length=100)
    date_publication: Optional[datetime] = None
    date_expiration: Optional[datetime] = None
    url: HttpUrl
    source: str = Field(..., min_length=1, max_length=100)
    teletravail: bool = False

    @field_validator("titre")
    @classmethod
    def titre_non_vide(cls, v: str) -> str:
        """Vérifie que le titre n'est pas vide."""
        if not v.strip():
            raise ValueError("Le titre ne peut pas être vide")
        return v.strip()

    @field_validator("source")
    @classmethod
    def source_non_vide(cls, v: str) -> str:
        """Vérifie que la source n'est pas vide."""
        if not v.strip():
            raise ValueError("La source ne peut pas être vide")
        return v.strip()


class JobResponse(JobCreate):
    """Schéma de réponse pour une offre."""

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
    }


class JobListResponse(BaseModel):
    """Réponse paginée pour la liste d'offres."""

    total: int
    limit: int
    offset: int
    results: list[dict]
`,

  // ═══════════════════════════════════════════════════════════════
  // 15. app/services/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/services/__init__.py": `
"""Services métier de Job Africa."""
`,

  // ═══════════════════════════════════════════════════════════════
  // 16. app/services/normalizer.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/services/normalizer.py": `
"""
Normalisation des données d'offres d'emploi.

Fonctions :
    - clean_text : nettoie un texte (HTML, espaces)
    - detect_pays : détecte le pays depuis le texte
    - normalize_url : nettoie une URL (retire tracking)
    - parse_date : convertit une date en ISO 8601
    - normalize_job : normalise une offre complète
    - job_fingerprint : empreinte pour la déduplication
"""

import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, urlunparse

from slugify import slugify


# ==================== Mapping pays ====================
PAYS_AFRIQUE_OUEST = {
    "benin": "Bénin",
    "bénin": "Bénin",
    "togo": "Togo",
    "cote d'ivoire": "Côte d'Ivoire",
    "côte d'ivoire": "Côte d'Ivoire",
    "ivory coast": "Côte d'Ivoire",
    "senegal": "Sénégal",
    "sénégal": "Sénégal",
    "burkina faso": "Burkina Faso",
    "burkina": "Burkina Faso",
    "mali": "Mali",
    "niger": "Niger",
    "guinee": "Guinée",
    "guinée": "Guinée",
    "ghana": "Ghana",
    "nigeria": "Nigeria",
}


def clean_text(value: Optional[str]) -> Optional[str]:
    """
    Nettoie un texte :
    - supprime les balises HTML
    - supprime les caractères de contrôle
    - normalise les espaces

    Args:
        value: Texte à nettoyer

    Returns:
        Texte nettoyé ou None
    """

    if not value:
        return None

    # Supprime les balises HTML
    value = re.sub(r"<[^>]+>", " ", value)

    # Supprime les caractères de contrôle
    value = re.sub(r"[\\x00-\\x1f\\x7f]", " ", value)

    # Normalise les espaces multiples
    value = " ".join(value.split())

    return value.strip() or None


def detect_pays(text: Optional[str]) -> Optional[str]:
    """
    Détecte le pays à partir d'un texte.

    Args:
        text: Texte à analyser

    Returns:
        Nom du pays normalisé ou None
    """

    if not text:
        return None

    text_lower = text.lower()

    for key, pays in PAYS_AFRIQUE_OUEST.items():
        if key in text_lower:
            return pays

    return None


def normalize_url(url: Optional[str]) -> Optional[str]:
    """
    Nettoie une URL :
    - retire les paramètres de tracking (utm_, fbclid, gclid)
    - retire le fragment
    - met le domaine en minuscules

    Args:
        url: URL à nettoyer

    Returns:
        URL nettoyée ou None
    """

    if not url:
        return None

    try:
        parsed = urlparse(str(url))

        # Filtre les paramètres de tracking
        query_parts = []
        if parsed.query:
            for part in parsed.query.split("&"):
                if not part.startswith(("utm_", "fbclid", "gclid")):
                    query_parts.append(part)

        return urlunparse((
            parsed.scheme,
            parsed.netloc.lower(),
            parsed.path.rstrip("/"),
            "",
            "&".join(query_parts),
            "",
        ))

    except Exception:
        return url


def parse_date(value) -> Optional[str]:
    """
    Convertit une date en ISO 8601.

    Supporte :
    - datetime Python
    - RFC 2822 (feedparser)
    - Formats courants (YYYY-MM-DD, DD/MM/YYYY, etc.)

    Args:
        value: Date à convertir

    Returns:
        Date ISO 8601 ou None
    """

    if not value:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, str):
        # Essaie le format RFC 2822 (utilisé par RSS)
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(value).isoformat()
        except Exception:
            pass

        # Essaie les formats courants
        for fmt in (
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
        ):
            try:
                return datetime.strptime(value, fmt).isoformat()
            except ValueError:
                continue

    return None


def normalize_job(job: dict) -> dict:
    """
    Normalise une offre d'emploi.

    Args:
        job: Offre brute

    Returns:
        Offre normalisée
    """

    titre = clean_text(job.get("titre")) or "Offre sans titre"
    description = clean_text(job.get("description"))

    # Détecte le pays si non fourni
    pays = clean_text(job.get("pays"))
    if not pays:
        pays = detect_pays(f"{titre} {description or ''}")

    return {
        "titre": titre[:300],
        "entreprise": clean_text(job.get("entreprise")),
        "pays": pays,
        "ville": clean_text(job.get("ville")),
        "description": description,
        "type_contrat": clean_text(job.get("type_contrat")),
        "niveau": clean_text(job.get("niveau")),
        "categorie": clean_text(job.get("categorie")),
        "date_publication": parse_date(job.get("date_publication")),
        "date_expiration": parse_date(job.get("date_expiration")),
        "url": normalize_url(job.get("url")),
        "source": clean_text(job.get("source")) or "Inconnu",
        "teletravail": bool(job.get("teletravail", False)),
    }


def job_fingerprint(job: dict) -> str:
    """
    Génère une empreinte pour la déduplication.

    Args:
        job: Offre normalisée

    Returns:
        Empreinte au format "titre|entreprise|ville"
    """

    parts = [
        slugify(job.get("titre") or ""),
        slugify(job.get("entreprise") or ""),
        slugify(job.get("ville") or ""),
    ]

    return "|".join(p for p in parts if p)
`,

  // ═══════════════════════════════════════════════════════════════
  // 17. app/services/job_service.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/services/job_service.py": `
"""
Service de gestion des offres d'emploi.

CRUD + recherche + statistiques.
"""

from typing import Optional

from app.core.supabase import supabase
from app.core.logger import get_logger
from app.services.normalizer import normalize_job


logger = get_logger(__name__)

TABLE = "jobs"


# ==================== CRÉATION ====================
def create_job(job: dict) -> list[dict]:
    """
    Insère ou met à jour une offre.

    Utilise upsert sur l'URL pour éviter les doublons.
    """

    normalized = normalize_job(job)

    try:
        response = (
            supabase.table(TABLE)
            .upsert(normalized, on_conflict="url")
            .execute()
        )
        return response.data or []

    except Exception as e:
        logger.error(f"Erreur création offre : {e}")
        return []


def bulk_create_jobs(jobs: list[dict]) -> dict:
    """
    Insère un lot d'offres.

    Returns:
        {inserted: int, skipped: int}
    """

    if not jobs:
        return {"inserted": 0, "skipped": 0}

    # Normalisation
    normalized = [normalize_job(j) for j in jobs]

    # Filtre les offres sans URL
    valides = [j for j in normalized if j.get("url")]

    skipped = len(jobs) - len(valides)

    if not valides:
        return {"inserted": 0, "skipped": skipped}

    # Insertion par lots de 100
    inserted = 0
    batch_size = 100

    for i in range(0, len(valides), batch_size):
        batch = valides[i:i + batch_size]

        try:
            response = (
                supabase.table(TABLE)
                .upsert(batch, on_conflict="url")
                .execute()
            )
            inserted += len(response.data or [])
        except Exception as e:
            logger.error(f"Erreur insertion lot : {e}")

    return {"inserted": inserted, "skipped": skipped}


# ==================== LECTURE ====================
def get_jobs(
    limit: int = 50,
    offset: int = 0,
    q: Optional[str] = None,
    pays: Optional[str] = None,
    ville: Optional[str] = None,
    categorie: Optional[str] = None,
    type_contrat: Optional[str] = None,
    teletravail: Optional[bool] = None,
) -> dict:
    """
    Recherche paginée avec filtres.

    Returns:
        {total: int, limit: int, offset: int, results: list}
    """

    query = supabase.table(TABLE).select("*", count="exact")

    # Recherche texte
    if q:
        query = query.or_(
            f"titre.ilike.%{q}%,"
            f"description.ilike.%{q}%,"
            f"entreprise.ilike.%{q}%"
        )

    # Filtres
    if pays:
        query = query.ilike("pays", f"%{pays}%")

    if ville:
        query = query.ilike("ville", f"%{ville}%")

    if categorie:
        query = query.eq("categorie", categorie)

    if type_contrat:
        query = query.eq("type_contrat", type_contrat)

    if teletravail is not None:
        query = query.eq("teletravail", teletravail)

    # Pagination + tri
    response = (
        query
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return {
        "total": response.count or 0,
        "limit": limit,
        "offset": offset,
        "results": response.data or [],
    }


def get_job(job_id: int) -> Optional[dict]:
    """Récupère une offre par son ID."""

    try:
        response = (
            supabase.table(TABLE)
            .select("*")
            .eq("id", job_id)
            .maybe_single()
            .execute()
        )
        return response.data if response else None

    except Exception as e:
        logger.error(f"Erreur lecture offre {job_id} : {e}")
        return None


# ==================== STATISTIQUES ====================
def get_stats() -> dict:
    """Statistiques globales."""

    try:
        total = (
            supabase.table(TABLE)
            .select("id", count="exact")
            .execute()
        )
        return {"total_offres": total.count or 0}

    except Exception as e:
        logger.error(f"Erreur stats : {e}")
        return {"total_offres": 0}


def get_countries() -> list[str]:
    """Liste des pays présents."""

    try:
        response = (
            supabase.table(TABLE)
            .select("pays")
            .not_.is_("pays", "null")
            .execute()
        )
        return sorted({
            r["pays"] for r in response.data or []
            if r.get("pays")
        })

    except Exception as e:
        logger.error(f"Erreur countries : {e}")
        return []


def get_categories() -> list[str]:
    """Liste des catégories présentes."""

    try:
        response = (
            supabase.table(TABLE)
            .select("categorie")
            .not_.is_("categorie", "null")
            .execute()
        )
        return sorted({
            r["categorie"] for r in response.data or []
            if r.get("categorie")
        })

    except Exception as e:
        logger.error(f"Erreur categories : {e}")
        return []


def get_sources() -> list[str]:
    """Liste des sources présentes."""

    try:
        response = (
            supabase.table(TABLE)
            .select("source")
            .not_.is_("source", "null")
            .execute()
        )
        return sorted({
            r["source"] for r in response.data or []
            if r.get("source")
        })

    except Exception as e:
        logger.error(f"Erreur sources : {e}")
        return []
`,

  // ═══════════════════════════════════════════════════════════════
  // 18. app/api/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/api/__init__.py": `
"""Routes FastAPI."""
`,

  // ═══════════════════════════════════════════════════════════════
  // 19. app/api/jobs.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/api/jobs.py": `
"""
Routes API pour les offres d'emploi.
"""

from fastapi import APIRouter, HTTPException, Query

from app.schemas.job import JobCreate
from app.services.job_service import (
    create_job,
    get_job,
    get_jobs,
)


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", summary="Lister les offres")
def list_jobs(
    q: str | None = Query(None, description="Recherche par mot-clé"),
    pays: str | None = Query(None, description="Filtrer par pays"),
    ville: str | None = Query(None, description="Filtrer par ville"),
    categorie: str | None = Query(None, description="Filtrer par catégorie"),
    type_contrat: str | None = Query(None, description="Filtrer par contrat"),
    teletravail: bool | None = Query(None, description="Télétravail uniquement"),
    limit: int = Query(50, ge=1, le=200, description="Nombre max de résultats"),
    offset: int = Query(0, ge=0, description="Offset de pagination"),
):
    """
    Liste paginée des offres avec filtres multiples.
    """

    return get_jobs(
        limit=limit,
        offset=offset,
        q=q,
        pays=pays,
        ville=ville,
        categorie=categorie,
        type_contrat=type_contrat,
        teletravail=teletravail,
    )


@router.get("/{job_id}", summary="Détail d'une offre")
def find_job(job_id: int):
    """
    Récupère une offre par son ID.
    """

    job = get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")

    return job


@router.post("", status_code=201, summary="Créer une offre")
def add_job(job: JobCreate):
    """
    Crée une nouvelle offre.
    """

    result = create_job(job.model_dump())

    if not result:
        raise HTTPException(status_code=500, detail="Erreur création offre")

    return result[0] if isinstance(result, list) else result
`,

  // ═══════════════════════════════════════════════════════════════
  // 20. app/api/stats.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/api/stats.py": `
"""
Routes API pour les statistiques et référentiels.
"""

from fastapi import APIRouter

from app.services.job_service import (
    get_categories,
    get_countries,
    get_sources,
    get_stats,
)


router = APIRouter(tags=["stats"])


@router.get("/stats", summary="Statistiques globales")
def stats():
    """Statistiques globales de la plateforme."""
    return get_stats()


@router.get("/countries", summary="Pays disponibles")
def countries():
    """Liste des pays ayant des offres."""
    return get_countries()


@router.get("/categories", summary="Catégories disponibles")
def categories():
    """Liste des catégories d'offres."""
    return get_categories()


@router.get("/sources", summary="Sources disponibles")
def sources():
    """Liste des sources d'offres."""
    return get_sources()
`,

  // ═══════════════════════════════════════════════════════════════
  // 21. app/main.py
  // ═══════════════════════════════════════════════════════════════
  "backend/app/main.py": `
"""
Point d'entrée de l'application Job Africa API.

FastAPI avec CORS, healthcheck et routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logger import get_logger
from app.api import jobs, stats


logger = get_logger(__name__)


# ==================== Application ====================
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API de collecte et de diffusion "
        "d'offres d'emploi en Afrique de l'Ouest"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ==================== CORS ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Routers ====================
app.include_router(jobs.router)
app.include_router(stats.router)


# ==================== Root ====================
@app.get("/", tags=["root"], summary="Accueil")
def home():
    """Point d'entrée de l'API."""

    return {
        "message": "Bienvenue sur Job Africa API",
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["root"], summary="Healthcheck")
def health():
    """Vérification de l'état de l'API."""

    return {"status": "ok"}


# ==================== Démarrage ====================
@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application."""

    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("API démarrée avec succès")


@app.on_event("shutdown")
async def shutdown_event():
    """Actions à l'arrêt de l'application."""

    logger.info("API arrêtée")
`,

  // ═══════════════════════════════════════════════════════════════
  // 22. tests/__init__.py
  // ═══════════════════════════════════════════════════════════════
  "backend/tests/__init__.py": `
"""Tests unitaires et d'intégration."""
`,

  // ═══════════════════════════════════════════════════════════════
  // 23. tests/conftest.py
  // ═══════════════════════════════════════════════════════════════
  "backend/tests/conftest.py": `
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
`,

  // ═══════════════════════════════════════════════════════════════
  // 24. tests/test_api.py
  // ═══════════════════════════════════════════════════════════════
  "backend/tests/test_api.py": `
"""
Tests des endpoints API.
"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_home():
    """Test de l'endpoint racine."""
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "online"
    assert "version" in data
    assert "message" in data


def test_health():
    """Test de l'endpoint healthcheck."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_countries():
    """Test de l'endpoint countries."""
    response = client.get("/countries")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_categories():
    """Test de l'endpoint categories."""
    response = client.get("/categories")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_sources():
    """Test de l'endpoint sources."""
    response = client.get("/sources")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_stats():
    """Test de l'endpoint stats."""
    response = client.get("/stats")

    assert response.status_code == 200
    assert "total_offres" in response.json()


def test_jobs_list():
    """Test de la liste des offres."""
    response = client.get("/jobs")

    assert response.status_code == 200

    data = response.json()
    assert "total" in data
    assert "results" in data
    assert "limit" in data
    assert "offset" in data
`,

  // ═══════════════════════════════════════════════════════════════
  // 25. tests/test_normalizer.py
  // ═══════════════════════════════════════════════════════════════
  "backend/tests/test_normalizer.py": `
"""
Tests du service de normalisation.
"""

from app.services.normalizer import (
    clean_text,
    detect_pays,
    job_fingerprint,
    normalize_job,
    normalize_url,
    parse_date,
)


# ==================== clean_text ====================
def test_clean_text_espaces():
    assert clean_text("  Hello   World  ") == "Hello World"


def test_clean_text_html():
    assert clean_text("<p>Bonjour</p>") == "Bonjour"


def test_clean_text_none():
    assert clean_text(None) is None


def test_clean_text_vide():
    assert clean_text("") is None


# ==================== detect_pays ====================
def test_detect_pays_benin():
    assert detect_pays("Offre au Bénin") == "Bénin"


def test_detect_pays_senegal():
    assert detect_pays("Poste au Sénégal") == "Sénégal"


def test_detect_pays_aucun():
    assert detect_pays("Aucun pays mentionné") is None


# ==================== normalize_url ====================
def test_normalize_url_tracking():
    url = normalize_url("https://Example.com/job/?utm_source=x&fbclid=y")
    assert url == "https://example.com/job"


def test_normalize_url_fragment():
    url = normalize_url("https://example.com/job#section")
    assert url == "https://example.com/job"


# ==================== parse_date ====================
def test_parse_date_iso():
    assert parse_date("2026-09-15") is not None


def test_parse_date_fr():
    assert parse_date("15/09/2026") is not None


def test_parse_date_none():
    assert parse_date(None) is None


# ==================== normalize_job ====================
def test_normalize_job():
    job = {
        "titre": "  Développeur   Python ",
        "url": "https://example.com/job",
        "source": "Test",
    }

    result = normalize_job(job)

    assert result["titre"] == "Développeur Python"
    assert result["source"] == "Test"
    assert result["url"] == "https://example.com/job"


def test_normalize_job_detecte_pays():
    job = {
        "titre": "Développeur",
        "description": "Poste basé au Bénin",
        "url": "https://example.com/job",
        "source": "Test",
    }

    result = normalize_job(job)

    assert result["pays"] == "Bénin"


# ==================== job_fingerprint ====================
def test_job_fingerprint():
    job = {
        "titre": "Développeur Python",
        "entreprise": "ABC Corp",
        "ville": "Cotonou",
    }

    fp = job_fingerprint(job)

    assert "developpeur-python" in fp
    assert "abc-corp" in fp
    assert "cotonou" in fp
`,
};

// ==================== Fonction de résumé ====================
function showSummary(stats) {
  log.banner("✅ MODULE 01 — TERMINÉ");

  console.log("");
  console.log("  📄 Fichiers créés    :", stats.created);
  console.log("  📄 Fichiers écrasés  :", stats.overwritten);
  console.log("  📄 Fichiers ignorés  :", stats.skipped);
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN : aucun fichier n'a été réellement écrit.");
    console.log("");
  }

  console.log("  Prochaines étapes :");
  console.log("  ───────────────────────────────────────");
  console.log("");
  console.log("  1. Aller dans le dossier backend :");
  console.log("     cd backend");
  console.log("");
  console.log("  2. Créer l'environnement virtuel :");
  console.log("     python -m venv venv");
  console.log("");
  console.log("  3. Activer l'environnement :");
  console.log("     Windows : venv\\\\Scripts\\\\activate");
  console.log("     Linux/Mac : source venv/bin/activate");
  console.log("");
  console.log("  4. Installer les dépendances :");
  console.log("     pip install -r requirements.txt");
  console.log("");
  console.log("  5. Configurer .env (SUPABASE_URL et SUPABASE_KEY)");
  console.log("");
  console.log("  6. Lancer le serveur :");
  console.log("     uvicorn app.main:app --reload");
  console.log("");
  console.log("  7. Ouvrir la documentation :");
  console.log("     http://127.0.0.1:8000/docs");
  console.log("");

  if (OPTIONS.verbose) {
    console.log("  📋 Fichiers créés :");
    console.log("");
    for (const file of Object.keys(FILES)) {
      console.log("    " + file);
    }
    console.log("");
  }
}

// ==================== Étape 1 : Désinstallation ====================
function stepUninstall() {
  log.section("🗑️  Désinstallation du module 01");

  let removed = 0;

  for (const file of Object.keys(FILES)) {
    if (!exists(file)) continue;

    if (!OPTIONS.dryRun) {
      removeFile(file);
    }
    log.file(file, "removed");
    removed++;
  }

  if (!OPTIONS.dryRun) {
    markUninstalled(MODULE_ID);
  }

  log.banner("🗑️  Module 01 désinstallé");
  console.log("");
  console.log("  Fichiers supprimés :", removed);
  console.log("");
}

// ==================== Étape 2 : Création des fichiers ====================
function stepCreateFiles() {
  log.section(`📄 Création de ${Object.keys(FILES).length} fichiers`);

  const options = {
    overwrite: OPTIONS.force,
    dryRun: OPTIONS.dryRun,
    backup: true,
  };

  const results = writeFiles(FILES, options);

  // Affiche chaque fichier avec son statut
  for (const detail of results.details) {
    log.file(detail.path, detail.status);
  }

  log.info(
    `→ ${results.created} créé(s), ${results.overwritten} écrasé(s), ${results.skipped} ignoré(s)`
  );

  return results;
}

// ==================== Étape 3 : Enregistrement ====================
function stepRegister(results) {
  if (OPTIONS.dryRun) return;

  markInstalled(MODULE_ID, {
    version: MODULE_VERSION,
    installedAt: new Date().toISOString(),
    files: Object.keys(FILES),
    filesCreated: results.created,
    filesOverwritten: results.overwritten,
    filesSkipped: results.skipped,
  });

  log.info("État enregistré dans _state/installed.json");
}

// ==================== Main ====================
async function main() {
  log.banner("🚀 MODULE 01 — BACKEND BASE");
  console.log("");
  console.log("  Backend FastAPI + Supabase + Pydantic");
  console.log("");

  if (OPTIONS.dryRun) {
    log.warn("Mode DRY-RUN activé : aucune modification réelle");
    console.log("");
  }

  // ==================== Vérification des prérequis ====================
  if (!OPTIONS.uninstall) {
    if (!validateRequirements(REQUIREMENTS, MODULE_NAME)) {
      console.log("");
      log.info("Astuce : exécutez d'abord le module 00 :");
      console.log("    node 00-architecture.js");
      console.log("");
      process.exit(1);
    }

    if (isInstalled(MODULE_ID) && !OPTIONS.force) {
      log.warn("Le module 01 est déjà installé.");
      log.info("Utilisez --force pour réinstaller, ou --uninstall pour supprimer.");
      console.log("");
      log.info("Pour voir l'état : node run.js --status");
      process.exit(0);
    }
  }

  // ==================== Désinstallation ====================
  if (OPTIONS.uninstall) {
    stepUninstall();
    return;
  }

  // ==================== Création ====================
  const results = stepCreateFiles();
  stepRegister(results);

  // ==================== Résumé ====================
  showSummary({
    created: results.created,
    overwritten: results.overwritten,
    skipped: results.skipped,
  });
}

// ==================== Point d'entrée ====================
main().catch((e) => {
  log.error(`Erreur inattendue : ${e.message}`);
  if (OPTIONS.verbose) {
    console.error(e.stack);
  }
  process.exit(1);
});