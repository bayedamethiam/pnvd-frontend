"""
PNVD Backend — Optimized Collection Pipeline
Intègre tous les collecteurs (RSS, social) + scoring commentaires + déduplication.

Workflow optimisé :
1. Batch collect toutes sources (parallèle)
2. Score chaque article pour priorité commentaires
3. Collecte commentaires SEULEMENT pour articles prioritaires
4. Déduplication + NLP batch
5. Sauvegarde DB avec social metadata
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Tuple, Optional

from sqlalchemy import select, text

from core.cache import (
    memory_cache, persistent_cache, dedup_manager,
    sync_token, MemoryCache
)
from core.database import AsyncSessionLocal, Article, Source, Keyword, Alert, CollectLog
from core.nlp import analyze_article, infer_region, detect_language, infer_sentiment
from core.config import settings

from collectors.rss import RSS_SOURCES, fetch_rss_source, fetch_gdelt
from collectors.pipeline import get_active_sources, cleanup_old_articles
from collectors.ministry_tagger import tag_articles_batch
from collectors.ministry_aggregator import run_all_aggregations
from collectors.social_optimized import (
    optimized_youtube, optimized_twitter, optimized_reddit, ApifyTwitterCollector
)
from collectors.comments import comment_scorer, comment_collector

logger = logging.getLogger("pnvd.pipeline_optimized")


async def get_active_keywords() -> List[str]:
    """Récupère les mots-clés actifs depuis la DB."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Keyword.term).where(Keyword.active == True))
        return [row[0] for row in result.all()]


async def get_existing_article_hashes() -> set:
    """Récupère les hashes des articles existants pour déduplication."""
    async with AsyncSessionLocal() as db:
        # Cache les hashes en mémoire pour cette collection
        result = await db.execute(
            select(Article.uid).where(Article.collected_at > datetime.utcnow() - timedelta(hours=24))
        )
        return {row[0] for row in result.all()}


async def collect_rss_batch(keywords: List[str]) -> List[dict]:
    """Collecte tous les flux RSS en parallèle."""
    logger.info("[Pipeline] Démarrage collecte RSS batch...")

    active_sources = await get_active_sources()
    
    # GDELT en parallèle
    tasks = [
        fetch_rss_source(source, keywords)
        for source in active_sources
    ]
    tasks.append(fetch_gdelt(keywords))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_articles = []
    for i, result in enumerate(results[:-1]):
        if isinstance(result, tuple) and not isinstance(result, Exception):
            articles, status = result
            all_articles.extend(articles)
            logger.debug(f"[RSS] Source {i} : {len(articles)} articles")
    
    # GDELT
    if isinstance(results[-1], list):
        all_articles.extend(results[-1])
    
    logger.info(f"[Pipeline] RSS batch : {len(all_articles)} articles collectés")
    return all_articles


async def collect_social_batch(keywords: List[str]) -> List[dict]:
    """Collecte Twitter, YouTube, Reddit en parallèle (batch optimisé)."""
    logger.info("[Pipeline] Démarrage collecte SOCIAL batch...")
    
    social_articles = []
    tasks = []
    
    # YouTube — recherche par mots-clés + stats batch (2 appels, données complètes)
    if settings.youtube_api_key:
        tasks.append(optimized_youtube.search_keywords_batch(keywords))
    
    # Twitter — désactivé temporairement (API v2 payante $100/mois, scrapers gratuits bloqués)
    # Pour réactiver : décommenter quand un accès valide est disponible
    # if settings.apify_api_token:
    #     tasks.append(ApifyTwitterCollector.search_tweets(keywords=keywords))
    # elif settings.twitter_bearer_token:
    #     tasks.append(optimized_twitter.search_tweets_advanced(keywords=keywords))
    
    # Reddit search
    subreddits = ["senegal", "francais"]  # À adapter
    tasks.extend([
        optimized_reddit.search_subreddit(sr, keywords=keywords)
        for sr in subreddits
    ])
    
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                logger.warning(f"[Social] Exception: {result}")
            elif isinstance(result, tuple):
                articles, status = result
                social_articles.extend(articles)
            elif isinstance(result, list):
                social_articles.extend(result)
    
    logger.info(f"[Pipeline] Social batch : {len(social_articles)} articles collectés")
    return social_articles


async def score_and_collect_comments(
    articles: List[dict],
    keywords: List[str]
) -> List[dict]:
    """
    Score chaque article et collecte les commentaires SEULEMENT pour les prioritaires.
    
    Économie : ~90% des requêtes de commentaires évitées.
    """
    logger.info(f"[Pipeline] Scoring {len(articles)} articles pour commentaires...")
    
    priority_articles = []
    comment_tasks = []
    
    for article in articles:
        # Calculer priorité
        priority = comment_scorer.calculate_score(article, keywords)
        article['comment_priority'] = priority.score
        article['comment_reasons'] = priority.reasons
        
        # Collecter commentaires SEULEMENT si score élevé
        if priority.should_fetch:
            priority_articles.append(article)
            
            # Ajouter tâche de collecte selon la plateforme
            platform = article.get("platform", "").lower()
            
            if platform == "youtube":
                comment_tasks.append(
                    comment_collector.collect_youtube_comments(
                        article.get("video_id"),
                        max_comments=15
                    )
                )
            elif platform == "twitter":
                comment_tasks.append(
                    comment_collector.collect_twitter_conversation(
                        article.get("url").split("/")[-1],
                        max_replies=10
                    )
                )
            elif platform == "reddit":
                comment_tasks.append(
                    comment_collector.collect_reddit_comments(
                        article.get("url").split("/")[-3],
                        article.get("source_name").split("/")[-1],
                        max_comments=15
                    )
                )
    
    # Collecte parallèle
    if comment_tasks:
        comment_results = await asyncio.gather(*comment_tasks, return_exceptions=True)
        
        for i, article in enumerate(priority_articles[:len(comment_results)]):
            if i < len(comment_results) and isinstance(comment_results[i], dict):
                comment_data = comment_results[i]
                article['collected_comments'] = comment_data.get('comments', comment_data.get('replies', []))
                article['comment_meta'] = {
                    "count": comment_data.get('count', 0),
                    "status": comment_data.get('status', 'unknown')
                }
    
    logger.info(f"[Pipeline] {len(priority_articles)} articles scorer pour commentaires, "
                f"{len(comment_tasks)} tâches lancées")
    
    return articles  # Tous les articles (avec ou sans commentaires)


async def save_optimized_articles(raw_articles: List[dict]) -> Tuple[int, int]:
    """
    Sauvegarde articles avec déduplication avancée et NLP batch.

    Returns: (new_count, duplicate_count, new_article_ids)
    """
    if not raw_articles:
        return 0, 0, []

    logger.info(f"[Pipeline] Sauvegarde {len(raw_articles)} articles...")

    new_count = 0
    duplicate_count = 0
    new_article_ids: list[int] = []

    # Récupérer UIDs existants
    existing_uids = await get_existing_article_hashes()
    
    async with AsyncSessionLocal() as db:
        for raw in raw_articles:
            uid = raw.get("uid")
            
            # Déduplication
            if uid in existing_uids:
                duplicate_count += 1
                continue
            
            try:
                # NLP batch
                nlp = await analyze_article(
                    raw.get("title", ""),
                    raw.get("text", "")
                )
                
                # Préparer social metadata
                social_meta = {
                    "comment_priority": raw.get("comment_priority", 0),
                    "comment_count_collected": len(raw.get("collected_comments", [])),
                    "engagement_score": raw.get("engagement_score", 0),
                }
                
                # Insertser avec commentaires resumés
                comment_summary = []
                if raw.get("collected_comments"):
                    # Limiter à top 5 commentaires
                    for comment in raw.get("collected_comments", [])[:5]:
                        comment_summary.append({
                            "author": comment.get("author", "Unknown"),
                            "text": comment.get("text", "")[:200],
                            "score": comment.get("likes", 0)
                        })
                
                from sqlalchemy.dialects.sqlite import insert as sqlite_insert
                
                stmt = sqlite_insert(Article).values(
                    uid=uid,
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
                    comments=len(raw.get("collected_comments", [])),
                    matched_keywords=json.dumps(raw.get("matched_keywords", []), ensure_ascii=False),
                ).on_conflict_do_nothing(index_elements=["uid"])
                
                result = await db.execute(stmt)
                new_count += 1
                # Récupérer l'ID de l'article inséré pour le tagger
                inserted = await db.execute(
                    select(Article.id).where(Article.uid == uid)
                )
                row = inserted.scalar_one_or_none()
                if row:
                    new_article_ids.append(row)

            except Exception as e:
                logger.error(f"[Pipeline] Erreur sauvegarde {uid}: {e}")

        await db.commit()

    logger.info(f"[Pipeline] Sauvegarde complétée : {new_count} nouveaux, {duplicate_count} doublons")
    return new_count, duplicate_count, new_article_ids


async def run_optimized_collect_cycle():
    """
    Lance un cycle de collecte OPTIMISÉ avec batch + smart comments + cache.
    """
    logger.info("=" * 60)
    logger.info("CYCLE OPTIMISÉ DÉMARRAGE")
    logger.info("=" * 60)
    
    cycle_start = datetime.utcnow()
    
    try:
        # 1. Récupérer mots-clés actifs
        keywords = await get_active_keywords()
        logger.info(f"Mots-clés surveillés : {len(keywords)}")
        
        # 2. Nettoyage cache expiré
        memory_cache.clear_expired()
        
        # 3. BATCH collecte parallèle
        rss_articles, social_articles = await asyncio.gather(
            collect_rss_batch(keywords),
            collect_social_batch(keywords)
        )
        
        all_articles = rss_articles + social_articles
        logger.info(f"Total collecté : {len(all_articles)} articles")
        
        # 4. Score + collecte commentaires intelligent
        all_articles = await score_and_collect_comments(all_articles, keywords)
        
        # 5. Sauvegarde avec dédup avancée
        new_count, dup_count, new_ids = await save_optimized_articles(all_articles)

        # 6. Tagguer les nouveaux articles aux ministères concernés
        if new_ids:
            await tag_articles_batch(new_ids)
            # 6b. Agréger les stats ministérielles après chaque collecte
            await run_all_aggregations()

        # 7. Alertes
        await check_and_fire_alerts(new_count, all_articles)
        
        cycle_end = datetime.utcnow()
        duration = (cycle_end - cycle_start).total_seconds()
        
        logger.info("=" * 60)
        logger.info(f"CYCLE OPTIMISÉ TERMINÉ")
        logger.info(f"Temps total: {duration:.1f}s")
        logger.info(f"Nouveaux articles: {new_count}")
        logger.info(f"Doublons ignorés: {dup_count}")
        logger.info("=" * 60)
        
        # Log dans la BD
        async with AsyncSessionLocal() as db:
            log = CollectLog(
                source_id="pipeline_optimized",
                started_at=cycle_start,
                finished_at=cycle_end,
                articles_found=len(all_articles),
                articles_new=new_count,
                status="completed",
            )
            db.add(log)
            await db.commit()
    
    except Exception as e:
        logger.error(f"ERREUR cycle optimisé: {e}", exc_info=True)


async def check_and_fire_alerts(new_count: int, articles: List[dict]) -> None:
    """Détection d'alertes (identique à avant, optimisée)."""
    async with AsyncSessionLocal() as db:
        alerts_to_add = []
        
        # Pic de volume
        if new_count > 100:
            alerts_to_add.append(Alert(
                title=f"Pic de volume — {new_count} nouvelles mentions",
                description="Volume anormalement élevé",
                level="warning",
                triggered_by="volume_spike",
            ))
        
        # Sentiment négatif
        neg_articles = [a for a in articles if a.get("sentiment") == "negatif"]
        if articles and len(neg_articles) / len(articles) > 0.5:
            alerts_to_add.append(Alert(
                title=f"Sentiment négatif élevé — {len(neg_articles)} mentions",
                description="Tendance négative détectée",
                level="warning",
                triggered_by="negative_sentiment",
            ))
        
        for alert in alerts_to_add:
            db.add(alert)
        
        if alerts_to_add:
            await db.commit()
            logger.info(f"Alertes créées: {len(alerts_to_add)}")
