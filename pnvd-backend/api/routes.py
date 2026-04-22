"""
PNVD Backend — Routes API REST
Toutes les routes consommées par le frontend PNVD.
"""
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select, func, desc, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import (
    get_db, Article, Keyword, Source, Alert, CollectLog, ConnectorConfig,
    Ministry, MinistryKeyword, MinistrySource, ArticleMinistryLink, MinistryAggregation,
)
from core.nlp import analyze_article
from collectors.pipeline_optimized import run_optimized_collect_cycle as run_collect_cycle
from collectors.ministry_tagger import tag_recent_articles
from collectors.ministry_aggregator import run_all_aggregations, aggregate_ministry

logger = logging.getLogger("pnvd.api")
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Schémas Pydantic
# ─────────────────────────────────────────────────────────────────────────────

class ArticleOut(BaseModel):
    id: int
    uid: str
    source_id: str
    source_name: str
    platform: str
    title: str
    text: str
    url: str
    author: Optional[str]
    thumbnail: Optional[str]
    lang: str
    region: str
    published_at: datetime
    collected_at: datetime
    sentiment: str
    sentiment_score: float
    topics: list
    entities: list
    is_disinformation: bool
    likes: int
    shares: int
    comments: int
    matched_keywords: list

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_json(cls, obj: Article):
        return cls(
            id=obj.id,
            uid=obj.uid,
            source_id=obj.source_id,
            source_name=obj.source_name,
            platform=obj.platform,
            title=obj.title,
            text=obj.text,
            url=obj.url,
            author=obj.author,
            thumbnail=obj.thumbnail,
            lang=obj.lang,
            region=obj.region,
            published_at=obj.published_at,
            collected_at=obj.collected_at,
            sentiment=obj.sentiment,
            sentiment_score=obj.sentiment_score,
            topics=json.loads(obj.topics or "[]"),
            entities=json.loads(obj.entities or "[]"),
            is_disinformation=obj.is_disinformation,
            likes=obj.likes,
            shares=obj.shares,
            comments=obj.comments,
            matched_keywords=json.loads(obj.matched_keywords or "[]"),
        )


class KeywordIn(BaseModel):
    term: str
    active: bool = True


class NLPRequest(BaseModel):
    text: str
    title: str = ""


class ConnectorConfigIn(BaseModel):
    api_key: Optional[str] = None
    rate_limit: Optional[int] = None
    endpoint: Optional[str] = None
    active: Optional[bool] = None


class AlertOut(BaseModel):
    id: int
    title: str
    description: str
    level: str
    triggered_by: Optional[str]
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Articles
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/articles", response_model=List[ArticleOut])
async def get_articles(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    region: Optional[str] = None,
    lang: Optional[str] = None,
    search: Optional[str] = None,
    keyword: Optional[str] = None,
    hours: int = Query(24, ge=1, le=720),
):
    """
    Liste paginée des articles avec filtres.
    - hours: fenêtre temporelle (défaut 24h)
    - search: recherche full-text dans titre + texte
    - keyword: filtre sur les mots-clés matchés
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    q = select(Article).where(Article.published_at >= cutoff)

    if platform:
        q = q.where(Article.platform == platform)
    if sentiment:
        q = q.where(Article.sentiment == sentiment)
    if region:
        q = q.where(Article.region == region)
    if lang:
        q = q.where(Article.lang == lang)
    if search:
        q = q.where(or_(
            Article.title.ilike(f"%{search}%"),
            Article.text.ilike(f"%{search}%"),
            Article.author.ilike(f"%{search}%"),
        ))
    if keyword:
        q = q.where(Article.matched_keywords.ilike(f"%{keyword}%"))

    q = q.order_by(desc(Article.published_at))
    q = q.offset((page - 1) * limit).limit(limit)

    result = await db.execute(q)
    articles = result.scalars().all()
    return [ArticleOut.from_orm_with_json(a) for a in articles]


@router.get("/articles/count")
async def count_articles(
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24),
):
    """Nombre total d'articles dans la fenêtre temporelle."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    result = await db.execute(
        select(func.count(Article.id)).where(Article.published_at >= cutoff)
    )
    return {"count": result.scalar()}


# ─────────────────────────────────────────────────────────────────────────────
# Statistiques & Dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stats/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24),
):
    """
    Données complètes pour le dashboard PNVD.
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    # Comptages par sentiment
    sentiment_counts = {}
    for s in ["positif", "neutre", "negatif"]:
        r = await db.execute(
            select(func.count(Article.id))
            .where(Article.published_at >= cutoff, Article.sentiment == s)
        )
        sentiment_counts[s] = r.scalar() or 0

    total = sum(sentiment_counts.values())

    # Par plateforme
    platform_r = await db.execute(
        select(Article.platform, func.count(Article.id))
        .where(Article.published_at >= cutoff)
        .group_by(Article.platform)
    )
    platforms = {row[0]: row[1] for row in platform_r.all()}

    # Par région
    region_r = await db.execute(
        select(Article.region, func.count(Article.id))
        .where(Article.published_at >= cutoff)
        .group_by(Article.region)
        .order_by(desc(func.count(Article.id)))
        .limit(14)
    )
    regions = [{"name": row[0], "count": row[1]} for row in region_r.all()]

    # Par langue
    lang_r = await db.execute(
        select(Article.lang, func.count(Article.id))
        .where(Article.published_at >= cutoff)
        .group_by(Article.lang)
    )
    langs = {row[0]: row[1] for row in lang_r.all()}

    # Volume par heure (last 24h)
    hourly = []
    for h in range(min(hours, 24), 0, -1):
        h_start = datetime.utcnow() - timedelta(hours=h)
        h_end = h_start + timedelta(hours=1)
        r = await db.execute(
            select(func.count(Article.id))
            .where(Article.published_at >= h_start, Article.published_at < h_end)
        )
        hourly.append({"hour": h_start.strftime("%H:00"), "count": r.scalar() or 0})

    # Désinformation
    disinfo_r = await db.execute(
        select(func.count(Article.id))
        .where(Article.published_at >= cutoff, Article.is_disinformation == True)
    )
    disinfo_count = disinfo_r.scalar() or 0

    # Alertes non lues
    alert_r = await db.execute(
        select(func.count(Alert.id)).where(Alert.read == False)
    )
    unread_alerts = alert_r.scalar() or 0

    return {
        "total_mentions": total,
        "sentiment": {
            **sentiment_counts,
            "positif_pct": round(sentiment_counts["positif"] / max(total, 1) * 100, 1),
            "negatif_pct": round(sentiment_counts["negatif"] / max(total, 1) * 100, 1),
            "neutre_pct": round(sentiment_counts["neutre"] / max(total, 1) * 100, 1),
        },
        "platforms": platforms,
        "regions": regions,
        "languages": langs,
        "hourly_volume": hourly,
        "disinformation_count": disinfo_count,
        "unread_alerts": unread_alerts,
        "window_hours": hours,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/stats/platforms")
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Stats par plateforme : total articles, volume 7j, dernière collecte."""
    cutoff_all  = datetime.utcnow() - timedelta(days=days)
    cutoff_7d   = datetime.utcnow() - timedelta(days=7)

    # Total par plateforme sur la période
    r_total = await db.execute(
        select(Article.platform, func.count(Article.id))
        .where(Article.published_at >= cutoff_all)
        .group_by(Article.platform)
    )
    totals = {row[0]: row[1] for row in r_total.all()}

    # Volume 7j par plateforme
    r_7d = await db.execute(
        select(Article.platform, func.count(Article.id))
        .where(Article.published_at >= cutoff_7d)
        .group_by(Article.platform)
    )
    week = {row[0]: row[1] for row in r_7d.all()}

    # Dernière collecte par plateforme
    r_last = await db.execute(
        select(Article.platform, func.max(Article.collected_at))
        .group_by(Article.platform)
    )
    last_fetch = {row[0]: row[1].isoformat() if row[1] else None for row in r_last.all()}

    platforms = []
    for plat in totals:
        platforms.append({
            "platform": plat,
            "total": totals.get(plat, 0),
            "last_7_days": week.get(plat, 0),
            "last_fetch": last_fetch.get(plat),
        })
    platforms.sort(key=lambda x: x["total"], reverse=True)
    return platforms


@router.get("/stats/topics")
async def get_top_topics(
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24),
    limit: int = Query(10),
):
    """Topics les plus fréquents avec volume et sentiment."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    result = await db.execute(
        select(Article.topics, Article.sentiment)
        .where(Article.published_at >= cutoff, Article.topics != None)
    )
    rows = result.all()

    # Agrégation manuelle des topics
    topic_data = {}
    for topics_json, sentiment in rows:
        try:
            topics = json.loads(topics_json)
        except Exception:
            continue
        for topic in topics:
            if topic not in topic_data:
                topic_data[topic] = {"topic": topic, "vol": 0, "pos": 0, "neg": 0, "neu": 0}
            topic_data[topic]["vol"] += 1
            if sentiment == "positif":
                topic_data[topic]["pos"] += 1
            elif sentiment == "negatif":
                topic_data[topic]["neg"] += 1
            else:
                topic_data[topic]["neu"] += 1

    sorted_topics = sorted(topic_data.values(), key=lambda x: x["vol"], reverse=True)
    return sorted_topics[:limit]


@router.get("/stats/keywords")
async def get_keyword_stats(
    db: AsyncSession = Depends(get_db),
    hours: int = Query(24),
):
    """Occurrences réelles par mot-clé avec sentiment."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    kw_result = await db.execute(select(Keyword).where(Keyword.active == True))
    keywords = kw_result.scalars().all()

    stats = []
    for kw in keywords:
        # Compte les articles contenant ce mot-clé
        r = await db.execute(
            select(func.count(Article.id), Article.sentiment)
            .where(
                Article.published_at >= cutoff,
                Article.matched_keywords.ilike(f'%"{kw.term}"%')
            )
            .group_by(Article.sentiment)
        )
        rows = r.all()
        counts = {"positif": 0, "neutre": 0, "negatif": 0}
        for count, sentiment in rows:
            counts[sentiment] = count
        total_hits = sum(counts.values())

        stats.append({
            "term": kw.term,
            "hits": total_hits,
            "positif": counts["positif"],
            "neutre": counts["neutre"],
            "negatif": counts["negatif"],
            "alert": counts["negatif"] > total_hits * 0.4 and total_hits > 2,
        })

    return sorted(stats, key=lambda x: x["hits"], reverse=True)


# ─────────────────────────────────────────────────────────────────────────────
# Mots-clés
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/keywords")
async def list_keywords(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Keyword).order_by(desc(Keyword.created_at)))
    return result.scalars().all()


@router.post("/keywords", status_code=201)
async def add_keyword(body: KeywordIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Keyword).where(Keyword.term == body.term))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Mot-clé déjà existant")
    kw = Keyword(term=body.term, active=body.active)
    db.add(kw)
    await db.commit()
    return kw


@router.delete("/keywords/{term}")
async def delete_keyword(term: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Keyword).where(Keyword.term == term))
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="Mot-clé introuvable")
    await db.delete(kw)
    await db.commit()
    return {"deleted": term}


@router.patch("/keywords/{term}/toggle")
async def toggle_keyword(term: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Keyword).where(Keyword.term == term))
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="Mot-clé introuvable")
    kw.active = not kw.active
    await db.commit()
    return {"term": kw.term, "active": kw.active}


# ─────────────────────────────────────────────────────────────────────────────
# Sources
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/sources")
async def list_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Source))
    return result.scalars().all()


@router.post("/sources", status_code=201)
async def create_source(body: dict, db: AsyncSession = Depends(get_db)):
    """Ajoute un nouveau média/source de données."""
    import re
    name = (body.get("name") or "").strip()
    url  = (body.get("url")  or "").strip()
    platform = (body.get("platform") or "presse").strip().lower()
    lang = (body.get("lang") or "FR").strip().upper()
    if not name or not url:
        raise HTTPException(status_code=400, detail="name et url sont requis")
    src_id = re.sub(r"[^a-z0-9_]", "_", name.lower())[:48]
    existing = await db.execute(select(Source).where(Source.id == src_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Source déjà existante (même nom)")
    src = Source(id=src_id, name=name, url=url, platform=platform, lang=lang, active=True)
    db.add(src)
    await db.commit()
    await db.refresh(src)
    return {"id": src.id, "name": src.name, "url": src.url, "platform": src.platform,
            "lang": src.lang, "active": src.active, "last_fetch": None, "last_count": 0,
            "error_count": 0, "last_error": None}


@router.patch("/sources/{source_id}/toggle")
async def toggle_source(source_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Source).where(Source.id == source_id))
    src = result.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Source introuvable")
    src.active = not src.active
    await db.commit()
    return {"id": src.id, "active": src.active}


# ─────────────────────────────────────────────────────────────────────────────
# Alertes
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=List[AlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    unread_only: bool = False,
    limit: int = Query(50),
):
    q = select(Alert).order_by(desc(Alert.created_at)).limit(limit)
    if unread_only:
        q = q.where(Alert.read == False)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404)
    alert.read = True
    await db.commit()
    return {"id": alert_id, "read": True}


@router.post("/alerts/read-all")
async def mark_all_alerts_read(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Alert).where(Alert.read == False))
    alerts = result.scalars().all()
    for a in alerts:
        a.read = True
    await db.commit()
    return {"marked": len(alerts)}


# ─────────────────────────────────────────────────────────────────────────────
# NLP à la demande
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/nlp/analyze")
async def nlp_analyze(body: NLPRequest):
    """Analyse NLP d'un texte libre — utilisé par l'onglet NLP du dashboard."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Texte vide")
    result = await analyze_article(body.title, body.text)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Collecte manuelle
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/collect/trigger")
async def trigger_collect(background_tasks: BackgroundTasks):
    """Déclenche manuellement un cycle de collecte (en arrière-plan)."""
    background_tasks.add_task(run_collect_cycle)
    return {"status": "started", "message": "Collecte démarrée en arrière-plan"}


@router.get("/collect/status")
async def collect_status(db: AsyncSession = Depends(get_db)):
    """Retourne le statut des sources et la dernière collecte."""
    result = await db.execute(select(Source).order_by(Source.name))
    sources = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "platform": s.platform,
            "active": s.active,
            "last_fetch": s.last_fetch.isoformat() if s.last_fetch else None,
            "last_count": s.last_count,
            "error_count": s.error_count,
            "last_error": s.last_error,
            "status": "error" if s.last_error else ("ok" if s.last_fetch else "never"),
        }
        for s in sources
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Santé serveur
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/connectors/config")
async def get_connector_configs(db: AsyncSession = Depends(get_db)):
    """Retourne la configuration persistée de chaque connecteur (clé masquée)."""
    result = await db.execute(select(ConnectorConfig))
    configs = result.scalars().all()
    return {
        c.platform_id: {
            "platform_id": c.platform_id,
            "has_api_key": bool(c.api_key),
            "rate_limit": c.rate_limit,
            "endpoint": c.endpoint,
            "active": c.active,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in configs
    }


@router.patch("/connectors/{platform_id}/config")
async def update_connector_config(
    platform_id: str,
    body: ConnectorConfigIn,
    db: AsyncSession = Depends(get_db),
):
    """Upsert la configuration d'un connecteur et met à jour les settings runtime."""
    from core.config import settings as s

    result = await db.execute(
        select(ConnectorConfig).where(ConnectorConfig.platform_id == platform_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = ConnectorConfig(platform_id=platform_id)
        db.add(cfg)

    if body.api_key is not None:
        cfg.api_key = body.api_key or None
        # Mise à jour immédiate des settings en mémoire (collecteurs actifs)
        if platform_id == "yt":
            s.youtube_api_key = body.api_key
        elif platform_id == "x":
            s.twitter_bearer_token = body.api_key
        elif platform_id == "apify":
            s.apify_api_token = body.api_key
        elif platform_id == "anthropic":
            s.anthropic_api_key = body.api_key

    if body.rate_limit is not None:
        cfg.rate_limit = body.rate_limit
    if body.endpoint is not None:
        cfg.endpoint = body.endpoint or None
    if body.active is not None:
        cfg.active = body.active

    cfg.updated_at = datetime.utcnow()
    await db.commit()

    return {
        "platform_id": cfg.platform_id,
        "has_api_key": bool(cfg.api_key),
        "rate_limit": cfg.rate_limit,
        "endpoint": cfg.endpoint,
        "active": cfg.active,
        "updated_at": cfg.updated_at.isoformat(),
    }


@router.get("/connectors/health")
async def connectors_health(db: AsyncSession = Depends(get_db)):
    """
    Vérifie l'état réel de chaque connecteur via un appel API minimal.
    Retourne pour chaque connecteur : id, status (ok|error|unconfigured), latency_ms, message.
    """
    from core.config import settings

    results = {}

    async def check_youtube():
        if not settings.youtube_api_key:
            return {"status": "unconfigured", "latency_ms": None, "message": "Clé API absente"}
        t0 = datetime.utcnow()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={"part": "id", "q": "Sénégal", "maxResults": 1, "key": settings.youtube_api_key},
                )
            ms = int((datetime.utcnow() - t0).total_seconds() * 1000)
            if r.status_code == 200:
                return {"status": "ok", "latency_ms": ms, "message": "API opérationnelle"}
            elif r.status_code == 403:
                return {"status": "error", "latency_ms": ms, "message": "Quota dépassé ou clé invalide"}
            else:
                return {"status": "error", "latency_ms": ms, "message": f"HTTP {r.status_code}"}
        except Exception as e:
            return {"status": "error", "latency_ms": None, "message": str(e)[:80]}

    async def check_twitter():
        if not settings.twitter_bearer_token:
            return {"status": "unconfigured", "latency_ms": None, "message": "Token absent"}
        t0 = datetime.utcnow()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://api.twitter.com/2/tweets/search/recent",
                    headers={"Authorization": f"Bearer {settings.twitter_token}"},
                    params={"query": "Sénégal lang:fr", "max_results": 10},
                )
            ms = int((datetime.utcnow() - t0).total_seconds() * 1000)
            if r.status_code == 200:
                return {"status": "ok", "latency_ms": ms, "message": "API opérationnelle"}
            elif r.status_code in (401, 403):
                return {"status": "error", "latency_ms": ms, "message": "Token invalide ou accès refusé"}
            elif r.status_code == 429:
                return {"status": "warning", "latency_ms": ms, "message": "Rate limit atteint"}
            else:
                return {"status": "error", "latency_ms": ms, "message": f"HTTP {r.status_code}"}
        except Exception as e:
            return {"status": "error", "latency_ms": None, "message": str(e)[:80]}

    async def check_gdelt():
        t0 = datetime.utcnow()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "http://api.gdeltproject.org/api/v2/doc/doc",
                    params={"query": "Sénégal", "mode": "ArtList", "maxrecords": 1, "format": "json"},
                )
            ms = int((datetime.utcnow() - t0).total_seconds() * 1000)
            if r.status_code == 200:
                return {"status": "ok", "latency_ms": ms, "message": "API opérationnelle"}
            else:
                return {"status": "error", "latency_ms": ms, "message": f"HTTP {r.status_code}"}
        except Exception as e:
            return {"status": "error", "latency_ms": None, "message": str(e)[:80]}

    async def check_reddit():
        t0 = datetime.utcnow()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(
                    "https://www.reddit.com/search.json",
                    headers={"User-Agent": "PNVD-Bot/1.0"},
                    params={"q": "senegal", "limit": 1},
                )
            ms = int((datetime.utcnow() - t0).total_seconds() * 1000)
            if r.status_code == 200:
                return {"status": "ok", "latency_ms": ms, "message": "API opérationnelle"}
            else:
                return {"status": "error", "latency_ms": ms, "message": f"HTTP {r.status_code}"}
        except Exception as e:
            return {"status": "error", "latency_ms": None, "message": str(e)[:80]}

    async def check_rss_sources():
        result = await db.execute(select(Source).where(Source.active == True))
        sources = result.scalars().all()
        ok = sum(1 for s in sources if not s.last_error and s.last_fetch)
        err = sum(1 for s in sources if s.last_error)
        never = sum(1 for s in sources if not s.last_fetch)
        if never == len(sources):
            return {"status": "never", "latency_ms": None, "message": f"{len(sources)} sources, jamais collectées"}
        elif err > 0:
            return {"status": "warning", "latency_ms": None, "message": f"{ok} ok / {err} en erreur / {never} jamais"}
        else:
            return {"status": "ok", "latency_ms": None, "message": f"{ok} sources actives"}

    # Lancer tous les checks en parallèle
    yt, tw, gd, rd, rss = await asyncio.gather(
        check_youtube(), check_twitter(), check_gdelt(), check_reddit(), check_rss_sources(),
        return_exceptions=True,
    )

    def safe(r, fallback_id):
        if isinstance(r, Exception):
            return {"status": "error", "latency_ms": None, "message": str(r)[:80]}
        return r

    return {
        "youtube":  {**safe(yt, "youtube"),  "id": "yt"},
        "twitter":  {**safe(tw, "twitter"),  "id": "x"},
        "gdelt":    {**safe(gd, "gdelt"),    "id": "gdelt"},
        "reddit":   {**safe(rd, "reddit"),   "id": "reddit"},
        "presse":   {**safe(rss, "presse"),  "id": "rss"},
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    total_r = await db.execute(select(func.count(Article.id)))
    kw_r = await db.execute(select(func.count(Keyword.id)).where(Keyword.active == True))
    return {
        "status": "ok",
        "total_articles": total_r.scalar(),
        "active_keywords": kw_r.scalar(),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# MINISTÈRES — CRUD + SENTIMENT
# ─────────────────────────────────────────────────────────────────────────────

class MinistryKeywordIn(BaseModel):
    term: str
    term_type: str = "keyword"   # keyword | hashtag | person | institution | program
    weight: int = 3              # 1-5
    language: str = "FR"


class MinistryIn(BaseModel):
    id: str
    name: str
    short_name: str = ""
    level: str = "ministry"      # ministry | pole | primature | presidence
    parent_id: Optional[str] = None
    minister_name: Optional[str] = None
    description: Optional[str] = None
    color: str = "#3B82F6"
    icon: str = "🏛️"


@router.get("/ministries")
async def list_ministries(db: AsyncSession = Depends(get_db)):
    """Liste tous les ministères avec leur hiérarchie."""
    result = await db.execute(
        select(Ministry).where(Ministry.active == True).order_by(Ministry.level, Ministry.name)
    )
    ministries = result.scalars().all()

    def serialize(m: Ministry) -> dict:
        return {
            "id": m.id,
            "name": m.name,
            "short_name": m.short_name,
            "level": m.level,
            "parent_id": m.parent_id,
            "minister_name": m.minister_name,
            "description": m.description,
            "color": m.color,
            "icon": m.icon,
        }

    return [serialize(m) for m in ministries]


@router.post("/ministries")
async def create_ministry(data: MinistryIn, db: AsyncSession = Depends(get_db)):
    """Crée un nouveau ministère."""
    existing = await db.execute(select(Ministry).where(Ministry.id == data.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Ministère '{data.id}' existe déjà")
    ministry = Ministry(**data.model_dump(), active=True)
    db.add(ministry)
    await db.commit()
    return {"status": "created", "id": data.id}


@router.get("/ministries/{ministry_id}/keywords")
async def get_ministry_keywords(ministry_id: str, db: AsyncSession = Depends(get_db)):
    """Retourne les mots-clés d'un ministère."""
    result = await db.execute(
        select(MinistryKeyword)
        .where(MinistryKeyword.ministry_id == ministry_id)
        .order_by(MinistryKeyword.weight.desc(), MinistryKeyword.term_type)
    )
    kws = result.scalars().all()
    return [
        {
            "id": k.id,
            "term": k.term,
            "type": k.term_type,
            "weight": k.weight,
            "language": k.language,
            "active": k.active,
        }
        for k in kws
    ]


@router.post("/ministries/{ministry_id}/keywords")
async def add_ministry_keyword(
    ministry_id: str, data: MinistryKeywordIn, db: AsyncSession = Depends(get_db)
):
    """Ajoute un mot-clé à un ministère."""
    existing = await db.execute(
        select(MinistryKeyword).where(
            MinistryKeyword.ministry_id == ministry_id,
            MinistryKeyword.term == data.term,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ce terme existe déjà")
    kw = MinistryKeyword(ministry_id=ministry_id, **data.model_dump())
    db.add(kw)
    await db.commit()
    return {"status": "created"}


@router.delete("/ministries/{ministry_id}/keywords/{keyword_id}")
async def delete_ministry_keyword(
    ministry_id: str, keyword_id: int, db: AsyncSession = Depends(get_db)
):
    """Supprime un mot-clé d'un ministère."""
    result = await db.execute(
        select(MinistryKeyword).where(
            MinistryKeyword.id == keyword_id,
            MinistryKeyword.ministry_id == ministry_id,
        )
    )
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="Mot-clé introuvable")
    await db.delete(kw)
    await db.commit()
    return {"status": "deleted"}


@router.get("/ministries/{ministry_id}/sentiment")
async def get_ministry_sentiment(
    ministry_id: str,
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    limit: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne l'évolution du sentiment d'un ministère dans le temps.
    Utilise les agrégations pré-calculées.
    """
    result = await db.execute(
        select(MinistryAggregation)
        .where(
            MinistryAggregation.ministry_id == ministry_id,
            MinistryAggregation.period_type == period,
        )
        .order_by(MinistryAggregation.period_start.desc())
        .limit(limit)
    )
    aggs = result.scalars().all()

    return [
        {
            "period_start": a.period_start.isoformat(),
            "period_end": a.period_end.isoformat(),
            "total_mentions": a.total_mentions,
            "positive": a.positive_count,
            "negative": a.negative_count,
            "neutral": a.neutral_count,
            "avg_score": a.avg_sentiment_score,
            "trending": a.trending_score,
            "platform_breakdown": json.loads(a.platform_breakdown) if a.platform_breakdown else {},
            "top_topics": json.loads(a.top_topics) if a.top_topics else [],
            "top_terms": json.loads(a.top_terms) if a.top_terms else [],
        }
        for a in aggs
    ]


@router.get("/ministries/{ministry_id}/articles")
async def get_ministry_articles(
    ministry_id: str,
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    days: int = Query(0, ge=0, le=365),
    limit: int = Query(1000, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    """
    Articles liés à un ministère, triés par pertinence puis date.
    Filtres optionnels : platform, sentiment, période (days=0 = pas de filtre date).
    """
    q = (
        select(Article, ArticleMinistryLink.match_score, ArticleMinistryLink.matched_terms)
        .join(ArticleMinistryLink, ArticleMinistryLink.article_id == Article.id)
        .where(ArticleMinistryLink.ministry_id == ministry_id)
    )
    if days > 0:
        cutoff = datetime.utcnow() - timedelta(days=days)
        q = q.where(Article.published_at >= cutoff)
    if platform:
        q = q.where(Article.platform == platform)
    if sentiment:
        q = q.where(Article.sentiment == sentiment)

    q = q.order_by(Article.published_at.desc()).limit(limit)
    result = await db.execute(q)
    rows = result.all()

    return [
        {
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "platform": a.platform,
            "source_name": a.source_name,
            "published_at": a.published_at.isoformat(),
            "sentiment": a.sentiment,
            "sentiment_score": a.sentiment_score,
            "thumbnail": a.thumbnail,
            "topics": json.loads(a.topics) if a.topics else [],
            "match_score": round(score, 3),
            "matched_terms": json.loads(matched) if matched else [],
        }
        for a, score, matched in rows
    ]


@router.get("/ministries/{ministry_id}/topics")
async def get_ministry_topics(
    ministry_id: str,
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Sujets tendance pour un ministère, agrégés depuis les articles liés."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Article.topics, Article.sentiment)
        .join(ArticleMinistryLink, ArticleMinistryLink.article_id == Article.id)
        .where(
            ArticleMinistryLink.ministry_id == ministry_id,
            Article.published_at >= cutoff,
            Article.topics != None,
        )
    )
    rows = result.all()
    topic_data: dict = {}
    for topics_json, sentiment in rows:
        try:
            topics = json.loads(topics_json)
        except Exception:
            continue
        for t in topics:
            if t not in topic_data:
                topic_data[t] = {"topic": t, "vol": 0, "pos": 0, "neg": 0, "neu": 0}
            topic_data[t]["vol"] += 1
            if sentiment == "positif":
                topic_data[t]["pos"] += 1
            elif sentiment == "negatif":
                topic_data[t]["neg"] += 1
            else:
                topic_data[t]["neu"] += 1
    sorted_topics = sorted(topic_data.values(), key=lambda x: x["vol"], reverse=True)
    return sorted_topics[:limit]


@router.get("/ministries/{ministry_id}/dashboard")
async def get_ministry_dashboard(
    ministry_id: str, db: AsyncSession = Depends(get_db)
):
    """
    Vue synthétique pour le dashboard d'un ministre :
    - Statistiques des 7 derniers jours
    - Dernière agrégation journalière
    - Top sujets et termes
    - Répartition par plateforme
    """
    # Agrégat du jour
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    agg_result = await db.execute(
        select(MinistryAggregation)
        .where(
            MinistryAggregation.ministry_id == ministry_id,
            MinistryAggregation.period_type == "daily",
            MinistryAggregation.period_start >= today_start - timedelta(days=1),
        )
        .order_by(MinistryAggregation.period_start.desc())
        .limit(1)
    )
    latest_agg = agg_result.scalar_one_or_none()

    # Stats des 7 derniers jours en direct
    cutoff_7d = datetime.utcnow() - timedelta(days=7)
    stats_result = await db.execute(
        select(
            func.count(Article.id).label("total"),
            func.sum(case({Article.sentiment == "positif": 1}, else_=0)).label("pos"),
            func.sum(case({Article.sentiment == "negatif": 1}, else_=0)).label("neg"),
            func.avg(Article.sentiment_score).label("avg_score"),
        )
        .join(ArticleMinistryLink, ArticleMinistryLink.article_id == Article.id)
        .where(
            ArticleMinistryLink.ministry_id == ministry_id,
            Article.published_at >= cutoff_7d,
        )
    )
    stats = stats_result.one()

    # Breakdown plateforme sur 7 jours
    platform_result = await db.execute(
        select(Article.platform, func.count(Article.id))
        .join(ArticleMinistryLink, ArticleMinistryLink.article_id == Article.id)
        .where(
            ArticleMinistryLink.ministry_id == ministry_id,
            Article.published_at >= cutoff_7d,
        )
        .group_by(Article.platform)
    )
    platform_breakdown = {row[0]: row[1] for row in platform_result.all()}

    # Ministry info
    m_result = await db.execute(select(Ministry).where(Ministry.id == ministry_id))
    ministry = m_result.scalar_one_or_none()
    if not ministry:
        raise HTTPException(status_code=404, detail="Ministère introuvable")

    return {
        "ministry": {
            "id": ministry.id,
            "name": ministry.name,
            "short_name": ministry.short_name,
            "minister_name": ministry.minister_name,
            "icon": ministry.icon,
            "color": ministry.color,
        },
        "last_7_days": {
            "total_mentions": stats.total or 0,
            "avg_sentiment_score": round(float(stats.avg_score or 0), 3),
            "platform_breakdown": platform_breakdown,
        },
        "latest_daily": {
            "total_mentions": latest_agg.total_mentions if latest_agg else 0,
            "positive": latest_agg.positive_count if latest_agg else 0,
            "negative": latest_agg.negative_count if latest_agg else 0,
            "neutral": latest_agg.neutral_count if latest_agg else 0,
            "avg_score": latest_agg.avg_sentiment_score if latest_agg else 0.0,
            "trending": latest_agg.trending_score if latest_agg else 0.0,
            "top_topics": json.loads(latest_agg.top_topics) if latest_agg and latest_agg.top_topics else [],
            "top_terms": json.loads(latest_agg.top_terms) if latest_agg and latest_agg.top_terms else [],
            "platform_breakdown": json.loads(latest_agg.platform_breakdown) if latest_agg and latest_agg.platform_breakdown else {},
        },
    }


@router.post("/ministries/{ministry_id}/aggregate")
async def trigger_ministry_aggregation(
    ministry_id: str, background_tasks: BackgroundTasks, days_back: int = 0, db: AsyncSession = Depends(get_db)
):
    """Déclenche manuellement le calcul des agrégations pour un ministère.
    days_back=0 → aujourd'hui, days_back=1 → hier, etc.
    """
    reference = datetime.utcnow() - timedelta(days=days_back)
    background_tasks.add_task(aggregate_ministry, ministry_id, "daily", reference)
    background_tasks.add_task(aggregate_ministry, ministry_id, "weekly", reference)
    background_tasks.add_task(aggregate_ministry, ministry_id, "monthly", reference)
    return {"status": "started", "ministry_id": ministry_id, "reference_date": reference.date().isoformat()}


@router.post("/ministries/aggregate/all")
async def trigger_all_aggregations(background_tasks: BackgroundTasks):
    """Déclenche manuellement le calcul des agrégations pour tous les ministères."""
    background_tasks.add_task(run_all_aggregations)
    return {"status": "started"}


@router.post("/ministries/tag/recent")
async def trigger_tagging(
    hours: int = Query(24, ge=1, le=168), background_tasks: BackgroundTasks = None
):
    """Tagge les articles récents aux ministères (backfill)."""
    background_tasks.add_task(tag_recent_articles, hours)
    return {"status": "started", "hours": hours}


@router.post("/ministries/seed")
async def trigger_seed(background_tasks: BackgroundTasks):
    """Relance le seeder : crée les ministères manquants et leurs mots-clés."""
    from collectors.ministry_seeder import seed_ministries
    background_tasks.add_task(seed_ministries)
    return {"status": "started"}
