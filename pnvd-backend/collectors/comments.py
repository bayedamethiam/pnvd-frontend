"""
PNVD Backend — Intelligent Comment Collector
Détermine quels articles méritent une analyse de commentaires (scoring).
Collecte SEULEMENT les commentaires pertinents pour éviter la sur-consommation.
"""
import json
import logging
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass

import asyncio

from core.config import settings

logger = logging.getLogger("pnvd.comments")


@dataclass
class CommentPriority:
    """Résultat du scoring pour déterminer si un article mérite ses commentaires."""
    article_uid: str
    score: float  # 0.0-1.0
    should_fetch: bool
    reasons: List[str]


class CommentScoringEngine:
    """
    Scoring intelligent pour décider quels articles analyser en profondeur.
    
    Stratégie :
    - Score élevé = avoir les commentaires
    - Économe : ~30-50% des articles seulement
    """
    
    # Thresholds configurables
    MIN_ENGAGEMENT_SCORE = 30  # likes + shares + comments
    SENTIMENT_CRISIS_THRESHOLD = -0.7  # très négatif
    KEYWORD_CRISIS_TERMS = [
        "grève", "protestation", "violence", "urgence",
        "crise", "attaque", "urgence", "désastre",
        "catastrophe", "accident", "mort", "blessé"
    ]
    
    @staticmethod
    def calculate_score(article: dict, keywords: List[str]) -> CommentPriority:
        """
        Calcule un score de priorité pour analyser les commentaires.
        
        Facteurs :
        - Engagement (likes + shares + comments)
        - Sentiment (négatif = plus important)
        - Mots-clés de crise
        - Viralité
        """
        uid = article.get("uid", "")
        reasons = []
        score = 0.0
        
        # 1. Engagement brut (max 40%)
        engagement = article.get("likes", 0) + article.get("shares", 0) + article.get("comments", 0)
        if engagement > 100:
            score += 0.40
            reasons.append(f"High engagement: {engagement}")
        elif engagement > 50:
            score += 0.25
            reasons.append(f"Medium engagement: {engagement}")
        elif engagement > 20:
            score += 0.10
            reasons.append(f"Low engagement: {engagement}")
        
        # 2. Sentiment (max 30%)
        sentiment = article.get("sentiment", "neutre")
        sentiment_score = article.get("sentiment_score", 0.0)
        
        if sentiment == "negatif":
            if sentiment_score < -0.7:  # CRITIQUE
                score += 0.30
                reasons.append("CRISIS SENTIMENT DETECTED")
            elif sentiment_score < -0.4:
                score += 0.20
                reasons.append("High negative sentiment")
            else:
                score += 0.10
                reasons.append("Negative sentiment")
        elif sentiment == "positif" and engagement > 50:
            score += 0.05  # Moins prioritaire mais intéressant si viral
        
        # 3. Mots-clés de crise (max 20%)
        title = article.get("title", "").lower()
        text = article.get("text", "").lower()
        full_text = f"{title} {text}"
        
        crisis_match = [term for term in CommentScoringEngine.KEYWORD_CRISIS_TERMS 
                       if term in full_text]
        if crisis_match:
            score += min(0.20, len(crisis_match) * 0.05)
            reasons.append(f"Crisis keywords: {', '.join(crisis_match)}")
        
        # 4. Mots-clés surveillés (max 10%)
        matched_kws = article.get("matched_keywords", [])
        if isinstance(matched_kws, str):
            matched_kws = json.loads(matched_kws)
        
        if matched_kws:
            score += min(0.10, len(matched_kws) * 0.03)
            reasons.append(f"Watched keywords: {', '.join(matched_kws[:3])}")
        
        # Normaliser entre 0.0-1.0
        score = min(1.0, score)
        
        # Décision : score > 0.35 = analyser les commentaires
        should_fetch = score > 0.35
        
        logger.debug(
            f"CommentScore[{uid[:8]}] = {score:.2f} | "
            f"fetch={should_fetch} | reasons={reasons}"
        )
        
        return CommentPriority(
            article_uid=uid,
            score=score,
            should_fetch=should_fetch,
            reasons=reasons
        )


class CommentCollector:
    """
    Collecte les commentaires de manière économe.
    
    Stratégies par réseau social :
    - YouTube : top 20 comments (already sorted by API)
    - Twitter/X : top 10 replies (sorted by engagement)
    - Reddit : top 20 comments from pushshift alternative
    - Facebook : via webhooks seulement
    """
    
    @staticmethod
    async def collect_youtube_comments(
        video_id: str,
        max_comments: int = 20,
        only_top: bool = True
    ) -> dict:
        """
        Collecte les commentaires YouTube d'une vidéo.
        
        Optimisation :
        - TOP commentaires seulement (order=relevance)
        - 1 requête = 20 commentaires
        - Pas de commentaires "spam" (likes < 1)
        """
        if not settings.youtube_api_key:
            return {"comments": [], "error": "YouTube API key not configured"}
        
        try:
            import asyncio
            from googleapiclient.discovery import build
            
            # Note: googleapiclient n'est pas async, utiliser executor
            youtube = build('youtube', 'v3', developerKey=settings.youtube_api_key)
            
            request = youtube.commentThreads().list(
                part='snippet,replies',
                videoId=video_id,
                maxResults=min(max_comments, 100),
                order='relevance' if only_top else 'time',
                textFormat='plainText',
                fields=(
                    'items(snippet(topLevelComment(snippet(textDisplay,authorDisplayName,likeCount)),'
                    'replyCount),replies(snippet(textDisplay,authorDisplayName,likeCount)))'
                )
            )
            
            response = await asyncio.get_running_loop().run_in_executor(None, lambda: request.execute())
            
            comments = []
            for item in response.get('items', []):
                top_comment = item['snippet']['topLevelComment']['snippet']
                
                # Filtrer les commentaires avec 0 like (spam/bruit)
                if top_comment['likeCount'] >= 1 or only_top:
                    comments.append({
                        "author": top_comment['authorDisplayName'],
                        "text": top_comment['textDisplay'],
                        "likes": top_comment['likeCount'],
                        "replies": item['snippet']['replyCount'],
                        "platform": "youtube"
                    })
                
                # Bonus: inclure quelques top replies
                if 'replies' in item and len(comments) < max_comments:
                    for reply in item['replies'].get('comments', [])[:2]:
                        reply_snippet = reply['snippet']
                        if reply_snippet['likeCount'] >= 1:
                            comments.append({
                                "author": reply_snippet['authorDisplayName'],
                                "text": reply_snippet['textDisplay'],
                                "likes": reply_snippet['likeCount'],
                                "replies": 0,
                                "platform": "youtube_reply"
                            })
            
            logger.info(f"[YouTube] Collecté {len(comments)} commentaires pour {video_id}")
            return {
                "video_id": video_id,
                "comments": comments[:max_comments],
                "count": len(comments),
                "status": "ok"
            }
        
        except Exception as e:
            logger.error(f"[YouTube] Erreur commentaires {video_id}: {e}")
            return {"video_id": video_id, "comments": [], "error": str(e), "status": "error"}
    
    @staticmethod
    async def collect_twitter_conversation(
        tweet_id: str,
        max_replies: int = 15
    ) -> dict:
        """
        Collecte les réponses/replies d'un tweet (conversation filtrée).
        
        Optimisation :
        - Utiliser Twitter Search API v2 avec conversation_id
        - Limiter aux TOP replies (sorted by engagement)
        """
        if not settings.twitter_bearer_token:
            return {"replies": [], "error": "Twitter API not configured"}
        
        try:
            import httpx
            
            headers = {"Authorization": f"Bearer {settings.twitter_bearer_token}"}
            
            # Search pour les réponses au tweet
            query = f"conversation_id:{tweet_id} -is:retweet"
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    "https://api.twitter.com/2/tweets/search/recent",
                    headers=headers,
                    params={
                        "query": query,
                        "max_results": max_replies,
                        "tweet.fields": "public_metrics,created_at,author_id",
                        "expansions": "author_id",
                        "user.fields": "username",
                    }
                )
                response.raise_for_status()
                data = response.json()
            
            comments = []
            users = {u['id']: u for u in data.get('includes', {}).get('users', [])}
            
            for tweet in data.get('data', []):
                metrics = tweet.get('public_metrics', {})
                author_id = tweet.get('author_id')
                author = users.get(author_id, {}).get('username', 'Unknown')
                
                comments.append({
                    "author": author,
                    "text": tweet.get('text', ''),
                    "likes": metrics.get('like_count', 0),
                    "replies": metrics.get('reply_count', 0),
                    "platform": "twitter"
                })
            
            logger.info(f"[Twitter] Collecté {len(comments)} réponses pour {tweet_id}")
            return {
                "tweet_id": tweet_id,
                "replies": comments,
                "count": len(comments),
                "status": "ok"
            }
        
        except Exception as e:
            logger.error(f"[Twitter] Erreur réponses {tweet_id}: {e}")
            return {"tweet_id": tweet_id, "replies": [], "error": str(e), "status": "error"}
    
    @staticmethod
    async def collect_reddit_comments(
        post_id: str,
        subreddit: str,
        max_comments: int = 20
    ) -> dict:
        """
        Collecte les commentaires d'un post Reddit.
        
        Optimisation :
        - Utiliser sort=top (déjà trié par pertinence)
        - Limiter à top N (économe)
        - Pas d'authentification requise
        """
        try:
            import httpx
            
            headers = {"User-Agent": "PNVD-Bot/1.0"}
            
            # Reddit JSON API
            url = f"https://www.reddit.com/r/{subreddit}/comments/{post_id}.json"
            
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers, params={"sort": "top", "limit": max_comments})
                response.raise_for_status()
                data = response.json()
            
            comments = []
            
            # data[1] contient les commentaires
            for item in data[1].get('data', {}).get('children', [])[:max_comments]:
                if item['kind'] == 't1':  # Comment
                    comment_data = item['data']
                    comments.append({
                        "author": comment_data.get('author', '[deleted]'),
                        "text": comment_data.get('body', '')[:500],
                        "likes": comment_data.get('score', 0),
                        "replies": comment_data.get('replies', {}).get('data', {}).get('children', []).__len__(),
                        "platform": "reddit"
                    })
            
            logger.info(f"[Reddit] Collecté {len(comments)} commentaires pour {subreddit}/{post_id}")
            return {
                "post_id": post_id,
                "subreddit": subreddit,
                "comments": comments,
                "count": len(comments),
                "status": "ok"
            }
        
        except Exception as e:
            logger.error(f"[Reddit] Erreur commentaires {subreddit}/{post_id}: {e}")
            return {"post_id": post_id, "comments": [], "error": str(e), "status": "error"}


# Instance globale
comment_scorer = CommentScoringEngine()
comment_collector = CommentCollector()
