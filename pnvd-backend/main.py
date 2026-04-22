"""
PNVD Backend — Point d'entrée principal
Plateforme Nationale de Veille Digitale · République du Sénégal

Lancement :
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from core.config import settings
from core.database import init_db, AsyncSessionLocal, ConnectorConfig
from sqlalchemy import select
from api.routes import router
from collectors.pipeline import (
    initialize_sources,
    initialize_keywords,
    cleanup_old_articles,
)
from collectors.pipeline_optimized import run_optimized_collect_cycle as run_collect_cycle
from collectors.ministry_seeder import seed_ministries
from collectors.ministry_aggregator import run_all_aggregations

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pnvd")


# ─────────────────────────────────────────────────────────────────────────────
# Scheduler (collecte périodique)
# ─────────────────────────────────────────────────────────────────────────────

scheduler = AsyncIOScheduler(timezone="Africa/Dakar")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialisation au démarrage, nettoyage à l'arrêt."""
    logger.info("=" * 60)
    logger.info("PNVD Backend — Démarrage")
    logger.info(f"Base de données : {settings.database_url}")
    logger.info(f"Collecte toutes les {settings.collect_interval_minutes} minutes")
    logger.info(f"YouTube : {'✓ activé' if settings.youtube_enabled else '✗ clé manquante'}")
    logger.info(f"Twitter : {'✓ activé' if settings.twitter_enabled else '✗ clé manquante'}")
    logger.info(f"NLP Claude : {'✓ activé' if settings.nlp_enabled else '✗ clé manquante (NLP local actif)'}")
    logger.info("=" * 60)

    # Init base de données
    await init_db()
    await initialize_sources()
    await initialize_keywords()
    await seed_ministries()

    # Recharger les clés API depuis ConnectorConfig (override du .env)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ConnectorConfig))
        for cfg in result.scalars().all():
            if cfg.api_key:
                if cfg.platform_id == "yt":
                    settings.youtube_api_key = cfg.api_key
                    logger.info("YouTube API key chargée depuis la base de données")
                elif cfg.platform_id == "x":
                    settings.twitter_bearer_token = cfg.api_key
                    logger.info("Twitter Bearer Token chargé depuis la base de données")
                elif cfg.platform_id == "apify":
                    settings.apify_api_token = cfg.api_key
                    logger.info("Apify API token chargé depuis la base de données")
                elif cfg.platform_id == "anthropic":
                    settings.anthropic_api_key = cfg.api_key
                    logger.info("Anthropic API key chargée depuis la base de données")

    # Première collecte après 60s (laisse le temps au container de démarrer)
    async def delayed_first_collect():
        await asyncio.sleep(60)
        logger.info("Première collecte au démarrage...")
        await run_collect_cycle()
    asyncio.create_task(delayed_first_collect())

    # Collecte périodique
    scheduler.add_job(
        run_collect_cycle,
        trigger=IntervalTrigger(minutes=settings.collect_interval_minutes),
        id="collect",
        name="Collecte PNVD",
        replace_existing=True,
        max_instances=1,  # évite les chevauchements
    )

    # Nettoyage quotidien à 3h du matin (Dakar)
    scheduler.add_job(
        cleanup_old_articles,
        trigger="cron",
        hour=3,
        minute=0,
        id="cleanup",
        name="Nettoyage articles anciens",
    )

    # Agrégation ministérielle quotidienne à 4h du matin
    scheduler.add_job(
        run_all_aggregations,
        trigger="cron",
        hour=4,
        minute=0,
        id="ministry_aggregation",
        name="Agrégation sentiment ministères",
    )

    scheduler.start()
    logger.info("Scheduler démarré")

    yield  # Application en cours d'exécution

    # Arrêt propre
    scheduler.shutdown(wait=False)
    logger.info("PNVD Backend — Arrêt")


# ─────────────────────────────────────────────────────────────────────────────
# Application FastAPI
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="PNVD API",
    description="Plateforme Nationale de Veille Digitale — API REST",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — autorise le frontend PNVD
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(router, prefix="/api/v1")


# ─────────────────────────────────────────────────────────────────────────────
# Route racine
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "PNVD Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "articles": "/api/v1/articles",
            "dashboard": "/api/v1/stats/dashboard",
            "topics": "/api/v1/stats/topics",
            "keywords": "/api/v1/stats/keywords",
            "sources": "/api/v1/sources",
            "alerts": "/api/v1/alerts",
            "nlp": "/api/v1/nlp/analyze",
            "collect": "/api/v1/collect/trigger",
            "health": "/api/v1/health",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info",
    )
