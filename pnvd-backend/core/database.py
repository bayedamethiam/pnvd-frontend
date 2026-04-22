"""
PNVD Backend — Modèles de base de données (SQLAlchemy + SQLite async)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, Float, Integer, DateTime, Boolean, JSON, Index
from datetime import datetime
from typing import Optional, AsyncGenerator
from core.config import settings


engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Article(Base):
    """Une mention / article collecté depuis une source."""
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uid: Mapped[str] = mapped_column(String(512), unique=True, index=True)  # hash dédup

    # Source
    source_id: Mapped[str] = mapped_column(String(64), index=True)
    source_name: Mapped[str] = mapped_column(String(128))
    platform: Mapped[str] = mapped_column(String(32), index=True)  # Presse|YouTube|Reddit|Twitter

    # Contenu
    title: Mapped[str] = mapped_column(Text, default="")
    text: Mapped[str] = mapped_column(Text, default="")
    url: Mapped[str] = mapped_column(String(2048))
    author: Mapped[Optional[str]] = mapped_column(String(256))
    thumbnail: Mapped[Optional[str]] = mapped_column(String(2048))

    # Métadonnées
    lang: Mapped[str] = mapped_column(String(8), default="FR", index=True)
    region: Mapped[str] = mapped_column(String(64), default="National", index=True)
    published_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # NLP
    sentiment: Mapped[str] = mapped_column(String(16), default="neutre", index=True)
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    topics: Mapped[Optional[str]] = mapped_column(Text)          # JSON list
    entities: Mapped[Optional[str]] = mapped_column(Text)        # JSON list
    is_disinformation: Mapped[bool] = mapped_column(Boolean, default=False)
    nlp_analyzed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Engagement
    likes: Mapped[int] = mapped_column(Integer, default=0)
    shares: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)

    # Mots-clés matchés
    matched_keywords: Mapped[Optional[str]] = mapped_column(Text)  # JSON list

    __table_args__ = (
        Index("ix_articles_platform_published", "platform", "published_at"),
        Index("ix_articles_sentiment_published", "sentiment", "published_at"),
        Index("ix_articles_region_published", "region", "published_at"),
    )


class Keyword(Base):
    """Mots-clés surveillés."""
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    term: Mapped[str] = mapped_column(String(256), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    hit_count: Mapped[int] = mapped_column(Integer, default=0)


class Source(Base):
    """Sources de données configurées."""
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    url: Mapped[str] = mapped_column(String(2048))
    platform: Mapped[str] = mapped_column(String(32))
    lang: Mapped[str] = mapped_column(String(8), default="FR")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fetch: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text)


class ConnectorConfig(Base):
    """Configuration persistée par connecteur (clé API, rate limit, endpoint)."""
    __tablename__ = "connector_configs"

    platform_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    api_key: Mapped[Optional[str]] = mapped_column(Text)
    rate_limit: Mapped[int] = mapped_column(Integer, default=60)
    endpoint: Mapped[Optional[str]] = mapped_column(String(2048))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Alert(Base):
    """Alertes générées automatiquement."""
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(16), default="info")  # info|warning|critique
    triggered_by: Mapped[Optional[str]] = mapped_column(String(256))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    extra: Mapped[Optional[str]] = mapped_column(Text)  # JSON


class CollectLog(Base):
    """Journal des collectes."""
    __tablename__ = "collect_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(64), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    articles_found: Mapped[int] = mapped_column(Integer, default=0)
    articles_new: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="running")
    error: Mapped[Optional[str]] = mapped_column(Text)


# ─────────────────────────────────────────────────────────────────────────────
# MODÈLE MINISTÉRIEL
# ─────────────────────────────────────────────────────────────────────────────

class Ministry(Base):
    """
    Entité ministérielle — peut représenter un ministère, un pôle thématique,
    la Primature ou la Présidence.

    Hiérarchie : Présidence > Primature > Pôle > Ministère
    level : 'ministry' | 'pole' | 'primature' | 'presidence'
    """
    __tablename__ = "ministries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)   # ex: "telecoms"
    name: Mapped[str] = mapped_column(String(256))                   # ex: "Ministère des Télécommunications"
    short_name: Mapped[str] = mapped_column(String(64), default="")  # ex: "Télécoms"
    level: Mapped[str] = mapped_column(String(16), default="ministry", index=True)
    parent_id: Mapped[Optional[str]] = mapped_column(String(64))     # id du parent (pôle / primature)
    minister_name: Mapped[Optional[str]] = mapped_column(String(256))
    description: Mapped[Optional[str]] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(16), default="#3B82F6")  # couleur UI
    icon: Mapped[str] = mapped_column(String(64), default="📱")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MinistryKeyword(Base):
    """
    Mots-clés, hashtags, noms de personnes et programmes associés à un ministère.
    Tous modifiables depuis l'interface.

    type : 'keyword' | 'hashtag' | 'person' | 'institution' | 'program'
    """
    __tablename__ = "ministry_keywords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ministry_id: Mapped[str] = mapped_column(String(64), index=True)
    term: Mapped[str] = mapped_column(String(256))
    term_type: Mapped[str] = mapped_column(String(16), default="keyword")
    weight: Mapped[int] = mapped_column(Integer, default=3)   # 1 (faible) à 5 (critique)
    language: Mapped[str] = mapped_column(String(8), default="FR")  # FR | WOL | EN
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_ministry_keywords_ministry_active", "ministry_id", "active"),
    )


class MinistrySource(Base):
    """
    Sources médias pertinentes pour un ministère donné.
    Permet de pondérer l'importance d'une source pour un secteur.
    """
    __tablename__ = "ministry_sources"

    ministry_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    relevance: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class ArticleMinistryLink(Base):
    """
    Lien N-N entre un article et les ministères qu'il concerne.
    Un article peut concerner plusieurs ministères (ex: article sur le numérique
    peut toucher Télécoms ET Éducation).

    match_score : score de pertinence 0.0-1.0 basé sur keyword matching + NLP
    """
    __tablename__ = "article_ministry_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(Integer, index=True)
    ministry_id: Mapped[str] = mapped_column(String(64), index=True)
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    matched_terms: Mapped[Optional[str]] = mapped_column(Text)   # JSON list des termes matchés
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_article_ministry_unique", "article_id", "ministry_id", unique=True),
        Index("ix_article_ministry_ministry_date", "ministry_id", "created_at"),
    )


class MinistryAggregation(Base):
    """
    Agrégat de sentiment par ministère et par période.
    Calculé quotidiennement par le scheduler.

    period_type : 'daily' | 'weekly' | 'monthly'
    platform_breakdown : JSON — { "Presse": {count, avg_score}, "Twitter": {...}, ... }
    top_topics : JSON — [ {"topic": "internet", "count": 12}, ... ]
    top_terms : JSON — [ {"term": "ARTP", "count": 8}, ... ]
    """
    __tablename__ = "ministry_aggregations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ministry_id: Mapped[str] = mapped_column(String(64), index=True)
    period_type: Mapped[str] = mapped_column(String(16))
    period_start: Mapped[datetime] = mapped_column(DateTime)
    period_end: Mapped[datetime] = mapped_column(DateTime)
    total_mentions: Mapped[int] = mapped_column(Integer, default=0)
    positive_count: Mapped[int] = mapped_column(Integer, default=0)
    negative_count: Mapped[int] = mapped_column(Integer, default=0)
    neutral_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    trending_score: Mapped[float] = mapped_column(Float, default=0.0)  # variation vs période préc.
    platform_breakdown: Mapped[Optional[str]] = mapped_column(Text)
    top_topics: Mapped[Optional[str]] = mapped_column(Text)
    top_terms: Mapped[Optional[str]] = mapped_column(Text)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_ministry_agg_unique", "ministry_id", "period_type", "period_start", unique=True),
    )


class DBCacheEntry(Base):
    """Cache persisté en BD (utilisé par PersistentCache)."""
    __tablename__ = "cache_entries"

    key: Mapped[str] = mapped_column(String(512), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DBSyncToken(Base):
    """Tokens de synchronisation delta par plateforme (curseurs API)."""
    __tablename__ = "sync_tokens"

    platform: Mapped[str] = mapped_column(String(32), primary_key=True)
    next_token: Mapped[Optional[str]] = mapped_column(Text)
    last_cursor: Mapped[Optional[str]] = mapped_column(Text)
    last_sync: Mapped[Optional[datetime]] = mapped_column(DateTime)


async def init_db():
    """Crée toutes les tables si elles n'existent pas."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dépendance FastAPI pour obtenir une session DB."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
