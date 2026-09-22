"""
Point d'entrée de l'application Job Africa API.

FastAPI avec CORS, healthcheck et routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.middleware import LanguageMiddleware
from app.core.config import settings
from app.core.logger import get_logger
from app.services.scheduler import start_scheduler, stop_scheduler
from app.api import jobs, stats, collect, admin, collect_ats, collect_scrapers, collect_api, admin_dedup, companies, skills, favorites, alerts, admin_sources, ai, dashboard, auth


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


# ==================== Scheduler ====================
@app.on_event("startup")
async def start_scheduler_event():
    """Demarre le scheduler automatique au startup."""
    start_scheduler()


@app.on_event("shutdown")
async def stop_scheduler_event():
    """Arrete le scheduler proprement a l'arret."""
    stop_scheduler()
async def shutdown_event():
    """Actions à l'arrêt de l'application."""

    logger.info("API arrêtée")
