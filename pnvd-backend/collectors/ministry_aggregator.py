"""
PNVD — Ministry Aggregator
Calcule les agrégats de sentiment par ministère et par période (jour/semaine/mois).
Gère aussi l'agrégation hiérarchique : pôle = somme de ses ministères, etc.

Appelé quotidiennement par le scheduler.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from core.database import (
    AsyncSessionLocal,
    Article, Ministry, ArticleMinistryLink, MinistryAggregation,
)

logger = logging.getLogger("pnvd.ministry_aggregator")


def _period_bounds(period_type: str, reference: datetime) -> tuple[datetime, datetime]:
    """Calcule début/fin d'une période à partir d'une date de référence."""
    if period_type == "daily":
        start = reference.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
    elif period_type == "weekly":
        # Lundi de la semaine
        start = reference - timedelta(days=reference.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(weeks=1)
    elif period_type == "monthly":
        start = reference.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if reference.month == 12:
            end = start.replace(year=reference.year + 1, month=1)
        else:
            end = start.replace(month=reference.month + 1)
    else:
        raise ValueError(f"period_type inconnu: {period_type}")
    return start, end


async def _get_articles_for_ministry(
    ministry_id: str,
    period_start: datetime,
    period_end: datetime,
) -> list[dict]:
    """
    Récupère tous les articles liés à un ministère dans une période donnée.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(
                Article.id,
                Article.platform,
                Article.sentiment,
                Article.sentiment_score,
                Article.topics,
                Article.published_at,
                ArticleMinistryLink.matched_terms,
                ArticleMinistryLink.match_score,
            )
            .join(ArticleMinistryLink, ArticleMinistryLink.article_id == Article.id)
            .where(
                and_(
                    ArticleMinistryLink.ministry_id == ministry_id,
                    Article.published_at >= period_start,
                    Article.published_at < period_end,
                )
            )
        )
        rows = result.all()

    return [
        {
            "id": r[0],
            "platform": r[1],
            "sentiment": r[2],
            "sentiment_score": r[3] or 0.0,
            "topics": json.loads(r[4]) if r[4] else [],
            "published_at": r[5],
            "matched_terms": json.loads(r[6]) if r[6] else [],
            "match_score": r[7] or 0.0,
        }
        for r in rows
    ]


def _compute_stats(articles: list[dict]) -> dict:
    """
    Calcule les statistiques de sentiment et engagement à partir d'une liste d'articles.
    """
    if not articles:
        return {
            "total": 0,
            "positive": 0,
            "negative": 0,
            "neutral": 0,
            "avg_score": 0.0,
            "trending_score": 0.0,
            "platform_breakdown": {},
            "top_topics": [],
            "top_terms": [],
        }

    total = len(articles)
    positive = sum(1 for a in articles if a["sentiment"] == "positif")
    negative = sum(1 for a in articles if a["sentiment"] == "negatif")
    neutral = total - positive - negative
    avg_score = sum(a["sentiment_score"] for a in articles) / total

    # Breakdown par plateforme
    platforms: dict[str, dict] = {}
    for a in articles:
        p = a["platform"]
        if p not in platforms:
            platforms[p] = {"count": 0, "positive": 0, "negative": 0, "neutral": 0, "avg_score": 0.0, "scores": []}
        platforms[p]["count"] += 1
        platforms[p]["scores"].append(a["sentiment_score"])
        if a["sentiment"] == "positif":
            platforms[p]["positive"] += 1
        elif a["sentiment"] == "negatif":
            platforms[p]["negative"] += 1
        else:
            platforms[p]["neutral"] += 1

    platform_breakdown = {}
    for p, data in platforms.items():
        platform_breakdown[p] = {
            "count": data["count"],
            "positive": data["positive"],
            "negative": data["negative"],
            "neutral": data["neutral"],
            "avg_score": round(sum(data["scores"]) / len(data["scores"]), 3),
        }

    # Top topics
    topic_counts: dict[str, int] = {}
    for a in articles:
        for topic in a["topics"]:
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
    top_topics = sorted(
        [{"topic": t, "count": c} for t, c in topic_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    # Top termes matchés
    term_counts: dict[str, int] = {}
    for a in articles:
        for term in a["matched_terms"]:
            term_counts[term] = term_counts.get(term, 0) + 1
    top_terms = sorted(
        [{"term": t, "count": c} for t, c in term_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    return {
        "total": total,
        "positive": positive,
        "negative": negative,
        "neutral": neutral,
        "avg_score": round(avg_score, 3),
        "trending_score": 0.0,  # calculé séparément avec période précédente
        "platform_breakdown": platform_breakdown,
        "top_topics": top_topics,
        "top_terms": top_terms,
    }


async def aggregate_ministry(
    ministry_id: str,
    period_type: str,
    reference: Optional[datetime] = None,
) -> dict:
    """
    Calcule et sauvegarde l'agrégat pour un ministère et une période.
    """
    reference = reference or datetime.utcnow()
    period_start, period_end = _period_bounds(period_type, reference)

    articles = await _get_articles_for_ministry(ministry_id, period_start, period_end)
    stats = _compute_stats(articles)

    # Calcul du trending_score : variation vs période précédente
    prev_ref = period_start - timedelta(seconds=1)
    prev_start, prev_end = _period_bounds(period_type, prev_ref)
    prev_articles = await _get_articles_for_ministry(ministry_id, prev_start, prev_end)
    prev_total = len(prev_articles)
    if prev_total > 0:
        stats["trending_score"] = round((stats["total"] - prev_total) / prev_total, 3)
    else:
        stats["trending_score"] = 1.0 if stats["total"] > 0 else 0.0

    async with AsyncSessionLocal() as db:
        stmt = sqlite_insert(MinistryAggregation).values(
            ministry_id=ministry_id,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            total_mentions=stats["total"],
            positive_count=stats["positive"],
            negative_count=stats["negative"],
            neutral_count=stats["neutral"],
            avg_sentiment_score=stats["avg_score"],
            trending_score=stats["trending_score"],
            platform_breakdown=json.dumps(stats["platform_breakdown"], ensure_ascii=False),
            top_topics=json.dumps(stats["top_topics"], ensure_ascii=False),
            top_terms=json.dumps(stats["top_terms"], ensure_ascii=False),
            computed_at=datetime.utcnow(),
        ).on_conflict_do_update(
            index_elements=["ministry_id", "period_type", "period_start"],
            set_={
                "total_mentions": stats["total"],
                "positive_count": stats["positive"],
                "negative_count": stats["negative"],
                "neutral_count": stats["neutral"],
                "avg_sentiment_score": stats["avg_score"],
                "trending_score": stats["trending_score"],
                "platform_breakdown": json.dumps(stats["platform_breakdown"], ensure_ascii=False),
                "top_topics": json.dumps(stats["top_topics"], ensure_ascii=False),
                "top_terms": json.dumps(stats["top_terms"], ensure_ascii=False),
                "computed_at": datetime.utcnow(),
            },
        )
        await db.execute(stmt)
        await db.commit()

    logger.info(
        f"[Aggregator] {ministry_id} | {period_type} | "
        f"{period_start.date()} → {stats['total']} mentions, "
        f"score={stats['avg_score']:+.2f}, trending={stats['trending_score']:+.2f}"
    )
    return stats


async def aggregate_hierarchy_node(
    ministry_id: str,
    period_type: str,
    reference: Optional[datetime] = None,
) -> dict:
    """
    Pour un nœud parent (pôle, primature, présidence) :
    agrège les données de tous ses ministères enfants.
    """
    reference = reference or datetime.utcnow()
    period_start, period_end = _period_bounds(period_type, reference)

    async with AsyncSessionLocal() as db:
        # Récupérer tous les enfants directs
        result = await db.execute(
            select(Ministry.id).where(
                and_(Ministry.parent_id == ministry_id, Ministry.active == True)
            )
        )
        child_ids = [row[0] for row in result.all()]

    if not child_ids:
        return await aggregate_ministry(ministry_id, period_type, reference)

    # Agréger récursivement chaque enfant
    all_articles = []
    for child_id in child_ids:
        articles = await _get_articles_for_ministry(child_id, period_start, period_end)
        all_articles.extend(articles)

    # Dédupliquer par article_id (un article peut toucher plusieurs ministères enfants)
    seen = set()
    unique_articles = []
    for a in all_articles:
        if a["id"] not in seen:
            seen.add(a["id"])
            unique_articles.append(a)

    stats = _compute_stats(unique_articles)

    async with AsyncSessionLocal() as db:
        stmt = sqlite_insert(MinistryAggregation).values(
            ministry_id=ministry_id,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            total_mentions=stats["total"],
            positive_count=stats["positive"],
            negative_count=stats["negative"],
            neutral_count=stats["neutral"],
            avg_sentiment_score=stats["avg_score"],
            trending_score=stats["trending_score"],
            platform_breakdown=json.dumps(stats["platform_breakdown"], ensure_ascii=False),
            top_topics=json.dumps(stats["top_topics"], ensure_ascii=False),
            top_terms=json.dumps(stats["top_terms"], ensure_ascii=False),
            computed_at=datetime.utcnow(),
        ).on_conflict_do_update(
            index_elements=["ministry_id", "period_type", "period_start"],
            set_={
                "total_mentions": stats["total"],
                "positive_count": stats["positive"],
                "negative_count": stats["negative"],
                "neutral_count": stats["neutral"],
                "avg_sentiment_score": stats["avg_score"],
                "trending_score": stats["trending_score"],
                "platform_breakdown": json.dumps(stats["platform_breakdown"], ensure_ascii=False),
                "top_topics": json.dumps(stats["top_topics"], ensure_ascii=False),
                "top_terms": json.dumps(stats["top_terms"], ensure_ascii=False),
                "computed_at": datetime.utcnow(),
            },
        )
        await db.execute(stmt)
        await db.commit()

    return stats


async def run_all_aggregations(reference: Optional[datetime] = None) -> None:
    """
    Lance toutes les agrégations pour tous les ministères actifs.
    Ordre : ministères → pôles → primature → présidence.
    """
    reference = reference or datetime.utcnow()
    logger.info("[Aggregator] Démarrage agrégation complète...")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Ministry).where(Ministry.active == True)
        )
        all_ministries = result.scalars().all()

    # Trier par niveau : ministère d'abord, puis pôle, puis primature, puis présidence
    level_order = {"ministry": 0, "pole": 1, "primature": 2, "presidence": 3}
    sorted_ministries = sorted(all_ministries, key=lambda m: level_order.get(m.level, 0))

    for period_type in ["daily", "weekly", "monthly"]:
        for ministry in sorted_ministries:
            try:
                if ministry.level == "ministry":
                    await aggregate_ministry(ministry.id, period_type, reference)
                else:
                    await aggregate_hierarchy_node(ministry.id, period_type, reference)
            except Exception as e:
                logger.error(f"[Aggregator] Erreur {ministry.id}/{period_type}: {e}")

    logger.info("[Aggregator] Agrégation complète terminée.")
