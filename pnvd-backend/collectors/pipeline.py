"""
PNVD Backend — Pipeline de collecte principal
Orchestrate tous les collecteurs, déduplique, analyse NLP, sauvegarde en DB.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, delete
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from core.config import settings
from core.database import AsyncSessionLocal, Article, Source, Keyword, Alert, CollectLog
from core.nlp import analyze_article, infer_region, detect_language, infer_sentiment
from collectors.rss import (
    RSS_SOURCES, fetch_rss_source, fetch_gdelt,
    fetch_reddit, fetch_youtube, fetch_twitter
)

logger = logging.getLogger("pnvd.pipeline")


async def get_active_keywords() -> list[str]:
    """Récupère les mots-clés actifs depuis la DB."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Keyword.term).where(Keyword.active == True))
        return [row[0] for row in result.all()]


async def get_active_sources() -> list[dict]:
    """Récupère les sources RSS actives."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Source).where(Source.active == True, Source.platform == "Presse"))
        db_sources = result.scalars().all()
        active_ids = {s.id for s in db_sources}

    # Filtre les sources codées en dur selon la DB
    return [s for s in RSS_SOURCES if s["id"] in active_ids] if active_ids else RSS_SOURCES


async def save_articles(raw_articles: list[dict]) -> int:
    """
    Sauvegarde les articles en DB avec NLP.
    Retourne le nombre de nouveaux articles.
    """
    if not raw_articles:
        return 0

    new_count = 0

    async with AsyncSessionLocal() as db:
        # Vérifier quels UIDs existent déjà
        uids = [a["uid"] for a in raw_articles]
        existing = await db.execute(select(Article.uid).where(Article.uid.in_(uids)))
        existing_uids = {row[0] for row in existing.all()}

        to_insert = [a for a in raw_articles if a["uid"] not in existing_uids]

        for raw in to_insert:
            try:
                # NLP (local rapide, Claude si dispo)
                nlp = await analyze_article(raw.get("title", ""), raw.get("text", ""))

                stmt = sqlite_insert(Article).values(
                    uid=raw["uid"],
                    source_id=raw["source_id"],
                    source_name=raw["source_name"],
                    platform=raw["platform"],
                    title=raw.get("title", ""),
                    text=raw.get("text", ""),
                    url=raw["url"],
                    author=raw.get("author"),
                    thumbnail=raw.get("thumbnail"),
                    lang=nlp.get("lang", raw.get("lang", "FR")),
                    region=nlp.get("region", "National"),
                    published_at=raw.get("published_at", datetime.utcnow()),
                    sentiment=nlp.get("sentiment", "neutre"),
                    sentiment_score=nlp.get("sentiment_score", 0.0),
                    topics=json.dumps(nlp.get("topics", []), ensure_ascii=False),
                    entities=json.dumps(nlp.get("entities", []), ensure_ascii=False),
                    is_disinformation=nlp.get("is_disinformation", False),
                    nlp_analyzed=True,
                    likes=raw.get("likes", 0),
                    shares=raw.get("shares", 0),
                    comments=raw.get("comments", 0),
                    matched_keywords=json.dumps(raw.get("matched_keywords", []), ensure_ascii=False),
                ).on_conflict_do_nothing(index_elements=["uid"])
                await db.execute(stmt)
                new_count += 1
            except Exception as e:
                logger.error(f"Erreur sauvegarde article {raw.get('uid')}: {e}")

        await db.commit()

    logger.info(f"Pipeline: {new_count} nouveaux articles sur {len(raw_articles)} collectés")
    return new_count


async def check_and_fire_alerts(new_count: int, articles: list[dict]) -> None:
    """Vérifie les seuils et crée des alertes automatiques."""
    async with AsyncSessionLocal() as db:
        alerts_to_add = []

        # Pic de volume
        if new_count > 80:
            alerts_to_add.append(Alert(
                title=f"Pic de volume — {new_count} nouvelles mentions",
                description=f"Volume anormalement élevé détecté en une collecte.",
                level="warning",
                triggered_by="volume_spike",
            ))

        # Ratio négatif élevé
        neg = [a for a in articles if a.get("sentiment") == "negatif"]
        if articles and len(neg) / len(articles) > 0.5:
            pct = round(len(neg) / len(articles) * 100)
            alerts_to_add.append(Alert(
                title=f"Sentiment négatif élevé — {pct}% des mentions",
                description=f"{len(neg)} mentions négatives sur {len(articles)} collectées.",
                level="critique" if pct > 70 else "warning",
                triggered_by="negative_sentiment",
            ))

        # Désinformation détectée
        disinfo = [a for a in articles if a.get("is_disinformation")]
        if disinfo:
            alerts_to_add.append(Alert(
                title=f"Désinformation potentielle — {len(disinfo)} articles",
                description=f"Contenu suspect détecté : {', '.join(a.get('title','')[:50] for a in disinfo[:3])}",
                level="critique",
                triggered_by="disinformation",
            ))

        for alert in alerts_to_add:
            db.add(alert)

        if alerts_to_add:
            await db.commit()
            logger.info(f"Alertes créées: {len(alerts_to_add)}")


async def update_source_status(source_id: str, status: str, count: int, error: Optional[str] = None) -> None:
    """Met à jour le statut d'une source en DB."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Source).where(Source.id == source_id))
        source = result.scalar_one_or_none()
        if source:
            source.last_fetch = datetime.utcnow()
            source.last_count = count
            if error:
                source.error_count += 1
                source.last_error = error
            else:
                source.last_error = None
            await db.commit()


async def cleanup_old_articles() -> None:
    """Supprime les articles plus vieux que HISTORY_DAYS."""
    cutoff = datetime.utcnow() - timedelta(days=settings.history_days)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            delete(Article).where(Article.published_at < cutoff)
        )
        await db.commit()
        deleted = result.rowcount
        if deleted:
            logger.info(f"Nettoyage: {deleted} articles supprimés (>{settings.history_days}j)")


async def run_collect_cycle() -> dict:
    """
    Lance un cycle complet de collecte.
    Retourne un résumé {source: count, ...}.
    """
    logger.info("=== Démarrage cycle de collecte ===")
    start = datetime.utcnow()

    keywords = await get_active_keywords()
    active_sources = await get_active_sources()

    all_raw = []
    summary = {}

    # ── RSS en batches de 4 (limite mémoire) ──────────────────────────────
    BATCH = 4
    rss_results_all = []
    for i in range(0, len(active_sources), BATCH):
        batch = active_sources[i:i+BATCH]
        batch_results = await asyncio.gather(
            *[fetch_rss_source(src, keywords) for src in batch],
            return_exceptions=True
        )
        rss_results_all.extend(zip(batch, batch_results))

    for src, result in rss_results_all:
        if isinstance(result, Exception):
            logger.error(f"[{src['id']}] Exception: {result}")
            await update_source_status(src["id"], "error", 0, str(result))
            summary[src["id"]] = 0
        else:
            articles, status = result
            all_raw.extend(articles)
            await update_source_status(src["id"], status, len(articles))
            summary[src["id"]] = len(articles)

    # ── Sources globales en parallèle ──────────────────────────────────────
    global_tasks = [
        fetch_gdelt(keywords),
        fetch_reddit(keywords),
        fetch_youtube(keywords, settings.youtube_api_key),
        fetch_twitter(keywords, settings.twitter_token),
    ]
    gdelt_arts, reddit_arts, yt_arts, tw_arts = await asyncio.gather(*global_tasks, return_exceptions=True)

    for name, result in [("gdelt", gdelt_arts), ("reddit", reddit_arts), ("youtube", yt_arts), ("twitter", tw_arts)]:
        if isinstance(result, Exception):
            logger.warning(f"[{name}] Exception: {result}")
            summary[name] = 0
        else:
            all_raw.extend(result)
            summary[name] = len(result)

    # ── Sauvegarde & analyse ───────────────────────────────────────────────
    new_count = await save_articles(all_raw)
    await check_and_fire_alerts(new_count, all_raw)

    elapsed = (datetime.utcnow() - start).total_seconds()
    summary["_meta"] = {
        "total_collected": len(all_raw),
        "new_articles": new_count,
        "duration_seconds": round(elapsed, 1),
        "keywords_used": keywords,
        "timestamp": start.isoformat(),
    }

    logger.info(f"=== Cycle terminé: {new_count} nouveaux / {len(all_raw)} total en {elapsed:.1f}s ===")
    return summary


async def initialize_sources() -> None:
    """Insère les sources par défaut en DB si elles n'existent pas."""
    async with AsyncSessionLocal() as db:
        for src in RSS_SOURCES:
            result = await db.execute(select(Source).where(Source.id == src["id"]))
            if not result.scalar_one_or_none():
                db.add(Source(
                    id=src["id"],
                    name=src["name"],
                    url=src["url"],
                    platform="Presse",
                    lang=src.get("lang", "FR"),
                    active=True,
                ))
        await db.commit()


async def initialize_keywords() -> None:
    """Insère les mots-clés par défaut en DB si aucun n'existe."""
    DEFAULT_KEYWORDS = [
        "Sénégal", "Dakar", "gouvernement", "Sonko", "budget",
        "Sangomar", "BFEM", "grève", "carburant", "#SenPol",
        "UCAD", "élection", "Macky", "Faye", "pétrole",
    ]
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Keyword))
        if result.first():
            return  # Déjà initialisé
        for term in DEFAULT_KEYWORDS:
            db.add(Keyword(term=term, active=True))
        await db.commit()
