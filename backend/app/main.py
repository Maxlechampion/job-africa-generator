"""
Point d'entree de l'application Job Africa API.

FastAPI avec CORS, healthcheck, scheduler et routers.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.middleware import LanguageMiddleware
from app.core.config import settings
from app.core.logger import get_logger
from app.services.scheduler import start_scheduler, stop_scheduler
from app.api import (
    jobs,
    stats,
    collect,
    admin,
    collect_ats,
    collect_scrapers,
    collect_api,
    admin_dedup,
    companies,
    skills,
    favorites,
    alerts,
    admin_sources,
    ai,
    dashboard,
    auth,
    share,
    push,
    payments,
    premium,
    sponsored,
)


logger = get_logger(__name__)


# ==================== Lifespan (démarrage / arrêt) ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère le cycle de vie de l'application.

    - Au démarrage : initialise le scheduler
    - À l'arrêt : arrête le scheduler proprement
    """

    # ==================== Démarrage ====================
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("API démarrée avec succès")

    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Erreur démarrage scheduler : {e}")

    yield

    # ==================== Arrêt ====================
    try:
        stop_scheduler()
    except Exception as e:
        logger.error(f"Erreur arrêt scheduler : {e}")

    logger.info("API arrêtée")


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
    lifespan=lifespan,
)


# ==================== Middleware ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LanguageMiddleware)


# ==================== Routers ====================
app.include_router(jobs.router)
app.include_router(stats.router)
app.include_router(collect.router)
app.include_router(admin.router)
app.include_router(collect_ats.router)
app.include_router(collect_scrapers.router)
app.include_router(collect_api.router)
app.include_router(admin_dedup.router)
app.include_router(companies.router)
app.include_router(skills.router)
app.include_router(favorites.router)
app.include_router(alerts.router)
app.include_router(admin_sources.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(share.router)
app.include_router(push.router)
app.include_router(payments.router)
app.include_router(premium.router)
app.include_router(sponsored.router)


# ==================== Root ====================
@app.get("/", tags=["root"], summary="Accueil")
def home():
    """Point d'entree de l'API."""

    return {
        "message": "Bienvenue sur Job Africa API",
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["root"], summary="Healthcheck")
def health():
    """Verification de l'etat de l'API."""

    return {"status": "ok"}
