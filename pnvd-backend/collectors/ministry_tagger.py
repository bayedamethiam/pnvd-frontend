"""
PNVD — Ministry Tagger
Pour chaque article collecté, détermine quels ministères sont concernés
en comparant le contenu aux mots-clés/hashtags de chaque ministère.

Résultat : enregistrements dans article_ministry_links avec un score de pertinence.
"""
import json
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from core.database import (
    AsyncSessionLocal,
    Article, Ministry, MinistryKeyword, ArticleMinistryLink,
)

logger = logging.getLogger("pnvd.ministry_tagger")


async def load_ministry_keywords() -> dict[str, list[dict]]:
    """
    Charge tous les mots-clés actifs par ministère.
    Retourne { ministry_id: [ {term, term_type, weight, language}, ... ] }
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(MinistryKeyword)
            .where(MinistryKeyword.active == True)
            .join(Ministry, Ministry.id == MinistryKeyword.ministry_id)
            .where(Ministry.active == True)
        )
        keywords = result.scalars().all()

    by_ministry: dict[str, list[dict]] = {}
    for kw in keywords:
        by_ministry.setdefault(kw.ministry_id, []).append({
            "term": kw.term,
            "type": kw.term_type,
            "weight": kw.weight,
            "language": kw.language,
        })
    return by_ministry


def compute_match_score(
    article: dict | Article,
    keywords: list[dict],
) -> tuple[float, list[str]]:
    """
    Calcule le score de pertinence d'un article pour un ministère.

    Retourne (score 0.0-1.0, liste des termes matchés).

    Logique de scoring :
    - Hashtag matché dans titre/texte : +0.25 × weight/5
    - Keyword matché dans titre       : +0.20 × weight/5
    - Keyword matché dans texte       : +0.10 × weight/5
    - Person/institution matchée      : +0.15 × weight/5
    - Programme matché                : +0.12 × weight/5
    Score plafonné à 1.0.
    """
    if isinstance(article, Article):
        title = (article.title or "").lower()
        text_body = (article.text or "").lower()
        topics_raw = article.topics or "[]"
        entities_raw = article.entities or "[]"
    else:
        title = (article.get("title", "") or "").lower()
        text_body = (article.get("text", "") or "").lower()
        topics_raw = article.get("topics", "[]") or "[]"
        entities_raw = article.get("entities", "[]") or "[]"

    try:
        topics = " ".join(json.loads(topics_raw)).lower()
    except Exception:
        topics = ""
    try:
        entities = " ".join(json.loads(entities_raw)).lower()
    except Exception:
        entities = ""

    full_text = f"{title} {text_body} {topics} {entities}"
    score = 0.0
    matched: list[str] = []

    weights_map = {
        "hashtag":     {"title": 0.25, "text": 0.15},
        "keyword":     {"title": 0.20, "text": 0.10},
        "person":      {"title": 0.15, "text": 0.10},
        "institution": {"title": 0.18, "text": 0.12},
        "program":     {"title": 0.15, "text": 0.10},
    }

    for kw in keywords:
        term = kw["term"].lower()
        kw_type = kw["type"]
        weight_factor = kw["weight"] / 5.0
        w = weights_map.get(kw_type, {"title": 0.10, "text": 0.05})

        if term in title:
            score += w["title"] * weight_factor
            matched.append(kw["term"])
        elif term in full_text:
            score += w["text"] * weight_factor
            matched.append(kw["term"])

    return min(score, 1.0), list(set(matched))


async def tag_article(article_id: int, ministry_keywords: dict[str, list[dict]]) -> int:
    """
    Tagge un article aux ministères concernés.
    Retourne le nombre de liens créés.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Article).where(Article.id == article_id))
        article = result.scalar_one_or_none()
        if not article:
            return 0

        links_created = 0
        for ministry_id, keywords in ministry_keywords.items():
            score, matched_terms = compute_match_score(article, keywords)
            if score < 0.10:  # seuil minimum de pertinence
                continue

            stmt = sqlite_insert(ArticleMinistryLink).values(
                article_id=article_id,
                ministry_id=ministry_id,
                match_score=round(score, 3),
                matched_terms=json.dumps(matched_terms, ensure_ascii=False),
                created_at=datetime.utcnow(),
            ).on_conflict_do_update(
                index_elements=["article_id", "ministry_id"],
                set_={"match_score": round(score, 3), "matched_terms": json.dumps(matched_terms, ensure_ascii=False)},
            )
            await db.execute(stmt)
            links_created += 1

        await db.commit()
    return links_created


async def tag_recent_articles(hours: int = 24) -> dict:
    """
    Tagge tous les articles collectés dans les dernières N heures.
    Utilisé au démarrage ou pour rattraper un backfill.
    """
    from datetime import timedelta

    ministry_keywords = await load_ministry_keywords()
    if not ministry_keywords:
        logger.warning("[MinistryTagger] Aucun mot-clé de ministère configuré.")
        return {"tagged": 0, "articles": 0}

    cutoff = datetime.utcnow() - timedelta(hours=hours)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Article.id).where(Article.collected_at >= cutoff)
        )
        article_ids = [row[0] for row in result.all()]

    total_links = 0
    for article_id in article_ids:
        total_links += await tag_article(article_id, ministry_keywords)

    logger.info(
        f"[MinistryTagger] {len(article_ids)} articles taggués → {total_links} liens créés"
    )
    return {"tagged": total_links, "articles": len(article_ids)}


async def tag_articles_batch(article_ids: list[int]) -> int:
    """
    Tagge une liste d'IDs d'articles.
    Appelé directement après la sauvegarde dans le pipeline.
    """
    if not article_ids:
        return 0

    ministry_keywords = await load_ministry_keywords()
    if not ministry_keywords:
        return 0

    total = 0
    for article_id in article_ids:
        total += await tag_article(article_id, ministry_keywords)

    logger.info(f"[MinistryTagger] Batch: {total} liens créés pour {len(article_ids)} articles")
    return total
