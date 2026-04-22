"""
PNVD Backend — Optimized Social Media Collectors
Collecte YouTube, Twitter, Reddit avec stratégies batch pour minimiser les requêtes.
"""
import logging
import hashlib
from typing import List, Optional, Tuple
from datetime import datetime, timezone
import httpx
import asyncio

from core.cache import memory_cache, sync_token
from core.config import settings
from collectors.comments import comment_scorer, comment_collector

logger = logging.getLogger("pnvd.social_optimized")


class OptimizedYouTubeCollector:
    """
    Collecteur YouTube BATCH — 1 requête = 50 vidéos + stats.
    Pas besoin de requêtes séparées par vidéo.
    """
    
    @staticmethod
    async def collect_channel_videos_batch(
        channel_id: str,
        max_videos: int = 50,
        keywords: List[str] = None
    ) -> Tuple[List[dict], str]:
        """
        Récupère les dernières vidéos d'un canal + stats intégrées en UNE requête.
        
        Quota savings: 1 call = 50 vidéos (vs 5+ appels traditionnels)
        """
        if not settings.youtube_api_key:
            logger.warning("[YouTube] API key not configured")
            return [], "no_api_key"
        
        # Vérifier le cache
        cache_key = f"yt:channel:{channel_id}:videos"
        cached = memory_cache.get(cache_key)
        if cached:
            return cached, "cached"
        
        try:
            base_url = "https://www.googleapis.com/youtube/v3"

            async with httpx.AsyncClient(timeout=15.0) as client:
                # Appel 1 : liste des vidéos du canal
                search_resp = await client.get(
                    f"{base_url}/search",
                    params={
                        "key": settings.youtube_api_key,
                        "channelId": channel_id,
                        "part": "snippet",
                        "maxResults": min(max_videos, 50),
                        "order": "date",
                        "type": "video",
                    }
                )
                search_resp.raise_for_status()
                search_response = search_resp.json()

                # Appel 2 : stats batch pour toutes les vidéos en une seule requête
                video_ids = [item['id']['videoId'] for item in search_response.get('items', []) if 'videoId' in item.get('id', {})]
                stats_by_id = {}
                if video_ids:
                    stats_resp = await client.get(
                        f"{base_url}/videos",
                        params={
                            "key": settings.youtube_api_key,
                            "id": ",".join(video_ids),
                            "part": "statistics",
                        }
                    )
                    stats_resp.raise_for_status()
                    stats_by_id = {item['id']: item for item in stats_resp.json().get('items', [])}
            
            # Merger les données
            articles = []
            keywords = keywords or []
            
            for item in search_response.get('items', []):
                video_id = item['id']['videoId']
                snippet = item['snippet']
                stats = stats_by_id.get(video_id, {}).get('statistics', {})
                
                title = snippet.get('title', '')
                description = snippet.get('description', '')[:1000]
                
                # Score d'engagement immédiat
                engagement = (
                    int(stats.get('viewCount', 0) or 0) * 0.1 +
                    int(stats.get('likeCount', 0) or 0) * 1.0 +
                    int(stats.get('commentCount', 0) or 0) * 2.0
                )
                
                matched_kws = [kw for kw in keywords if kw.lower() in f"{title} {description}".lower()]
                
                uid = hashlib.sha256(f"yt:{video_id}".encode()).hexdigest()[:32]
                
                articles.append({
                    "uid": uid,
                    "source_id": "youtube",
                    "source_name": snippet.get('channelTitle', ''),
                    "platform": "YouTube",
                    "title": title,
                    "text": description,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "author": snippet.get('channelTitle', ''),
                    "thumbnail": snippet.get('thumbnails', {}).get('high', {}).get('url'),
                    "lang": "FR",  # À détecter avec langdetect si nécessaire
                    "published_at": datetime.fromisoformat(
                        snippet.get('publishedAt', '').replace('Z', '+00:00')
                    ).replace(tzinfo=None),
                    "likes": int(stats.get('likeCount', 0) or 0),
                    "shares": 0,  # YouTube n'expose pas
                    "comments": int(stats.get('commentCount', 0) or 0),
                    "matched_keywords": matched_kws,
                    "engagement_score": engagement,
                    "video_id": video_id,
                })
            
            # Cache pour 1h
            memory_cache.set(cache_key, articles, ttl_seconds=3600)
            logger.info(f"[YouTube] BATCH collecté {len(articles)} vidéos pour {channel_id}")
            return articles, "ok"
        
        except Exception as e:
            logger.error(f"[YouTube] Erreur batch {channel_id}: {e}")
            return [], f"error:{str(e)}"

    @staticmethod
    async def search_keywords_batch(
        keywords: List[str],
        max_results: int = 20,
    ) -> List[dict]:
        """
        Recherche YouTube par mots-clés + stats en batch (2 appels).
        Remplace fetch_youtube : ajoute views/likes/comments en 1 appel supplémentaire.
        """
        if not settings.youtube_api_key:
            return []

        cache_key = f"yt:kw:{'_'.join(keywords[:3])}"
        cached = memory_cache.get(cache_key)
        if cached:
            return cached

        kw_part = " ".join(keywords[:5]) if keywords else ""
        query = f"{kw_part} Sénégal".strip() if kw_part else "Sénégal actualité"
        base_url = "https://www.googleapis.com/youtube/v3"

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                # Appel 1 : recherche par mots-clés
                search_resp = await client.get(
                    f"{base_url}/search",
                    params={
                        "key": settings.youtube_api_key,
                        "q": query,
                        "part": "snippet",
                        "regionCode": "SN",
                        "relevanceLanguage": "fr",
                        "maxResults": max_results,
                        "order": "date",
                        "type": "video",
                    }
                )
                if search_resp.status_code == 403:
                    logger.error("[YouTube] Quota dépassé ou clé invalide")
                    return []
                search_resp.raise_for_status()
                search_data = search_resp.json()

                # Appel 2 : stats batch pour toutes les vidéos
                video_ids = [
                    item['id']['videoId']
                    for item in search_data.get('items', [])
                    if 'videoId' in item.get('id', {})
                ]
                stats_by_id = {}
                if video_ids:
                    stats_resp = await client.get(
                        f"{base_url}/videos",
                        params={
                            "key": settings.youtube_api_key,
                            "id": ",".join(video_ids),
                            "part": "statistics",
                        }
                    )
                    stats_resp.raise_for_status()
                    stats_by_id = {
                        item['id']: item.get('statistics', {})
                        for item in stats_resp.json().get('items', [])
                    }

            articles = []
            for item in search_data.get('items', []):
                video_id = item.get('id', {}).get('videoId')
                if not video_id:
                    continue
                snippet = item['snippet']
                stats = stats_by_id.get(video_id, {})
                title = snippet.get('title', '')
                text = snippet.get('description', '')[:500]
                matched_kws = [kw for kw in keywords if kw.lower() in f"{title} {text}".lower()]

                articles.append({
                    "uid": hashlib.sha256(f"yt:{video_id}".encode()).hexdigest()[:32],
                    "source_id": "youtube",
                    "source_name": snippet.get('channelTitle', 'YouTube'),
                    "platform": "YouTube",
                    "title": title,
                    "text": text,
                    "url": f"https://youtube.com/watch?v={video_id}",
                    "author": snippet.get('channelTitle', ''),
                    "thumbnail": snippet.get('thumbnails', {}).get('medium', {}).get('url'),
                    "lang": "FR",
                    "published_at": datetime.fromisoformat(
                        snippet.get('publishedAt', '').replace('Z', '+00:00')
                    ).replace(tzinfo=None),
                    "likes": int(stats.get('likeCount', 0) or 0),
                    "shares": 0,
                    "comments": int(stats.get('commentCount', 0) or 0),
                    "matched_keywords": matched_kws,
                    "engagement_score": (
                        int(stats.get('viewCount', 0) or 0) * 0.1 +
                        int(stats.get('likeCount', 0) or 0) * 1.0 +
                        int(stats.get('commentCount', 0) or 0) * 2.0
                    ),
                    "video_id": video_id,
                })

            memory_cache.set(cache_key, articles, ttl_seconds=3600)
            logger.info(f"[YouTube] Batch keywords: {len(articles)} vidéos collectées (avec stats)")
            return articles

        except Exception as e:
            logger.error(f"[YouTube] Erreur search_keywords_batch: {e}")
            return []


class OptimizedTwitterCollector:
    """
    Collecteur Twitter/X — Search API v2 avec mots-clés en UNE requête.
    Syntaxe avancée pour combiner plusieurs termes.
    """
    
    @staticmethod
    async def search_tweets_advanced(
        keywords: List[str],
        languages: List[str] = None,
        max_results: int = 100,
        only_recent: bool = True
    ) -> Tuple[List[dict], str]:
        """
        Recherche avec OR/AND operators en UNE seule requête.
        
        Exemple query:
            (élection OR scrutin OR vote) (Sénégal OR Dakar) lang:fr
        """
        if not settings.twitter_bearer_token:
            logger.warning("[Twitter] Bearer token not configured")
            return [], "no_api_key"
        
        cache_key = f"x:search:{''.join(keywords[:3])}"
        cached = memory_cache.get(cache_key)
        if cached:
            return cached, "cached"
        
        # Construire query avancée
        kw_part = f"({' OR '.join(keywords[:10])})"
        lang_part = f"({' OR '.join([f'lang:{l}' for l in (languages or ['fr'])])})"
        
        # Exclure retweets
        query = f"{kw_part} {lang_part} -is:retweet"
        
        try:
            headers = {"Authorization": f"Bearer {settings.twitter_bearer_token}"}
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    "https://api.twitter.com/2/tweets/search/recent",
                    headers=headers,
                    params={
                        "query": query,
                        "max_results": max_results,
                        "tweet.fields": "public_metrics,created_at,author_id,lang",
                        "expansions": "author_id",
                        "user.fields": "username,verified,public_metrics",
                    }
                )
                response.raise_for_status()
                data = response.json()
            
            articles = []
            users = {u['id']: u for u in data.get('includes', {}).get('users', [])}
            
            for tweet in data.get('data', []):
                metrics = tweet.get('public_metrics', {})
                author_id = tweet.get('author_id')
                author_info = users.get(author_id, {})
                
                uid = hashlib.sha256(f"x:{tweet['id']}".encode()).hexdigest()[:32]
                
                articles.append({
                    "uid": uid,
                    "source_id": "twitter",
                    "source_name": author_info.get('username', 'Unknown'),
                    "platform": "Twitter",
                    "title": tweet.get('text', '')[:150],
                    "text": tweet.get('text', ''),
                    "url": f"https://twitter.com/{author_info.get('username', '')}/status/{tweet['id']}",
                    "author": author_info.get('username', ''),
                    "thumbnail": None,
                    "lang": tweet.get('lang', 'fr'),
                    "published_at": datetime.fromisoformat(
                        tweet.get('created_at', '').replace('Z', '+00:00')
                    ).replace(tzinfo=None),
                    "likes": metrics.get('like_count', 0),
                    "shares": metrics.get('retweet_count', 0),
                    "comments": metrics.get('reply_count', 0),
                    "matched_keywords": [kw for kw in keywords if kw.lower() in tweet.get('text', '').lower()],
                    "engagement_score": (
                        metrics.get('like_count', 0) * 1 +
                        metrics.get('retweet_count', 0) * 2 +
                        metrics.get('reply_count', 0) * 3
                    ),
                })
            
            memory_cache.set(cache_key, articles, ttl_seconds=600)  # 10min
            logger.info(f"[Twitter] Search collecté {len(articles)} tweets")
            return articles, "ok"
        
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 402:
                logger.warning("[Twitter] 402 Payment Required — bascule vers Apify")
                return await ApifyTwitterCollector.search_tweets(keywords, languages, max_results)
            logger.error(f"[Twitter] Erreur HTTP {e.response.status_code}: {e}")
            return [], f"error:{str(e)}"
        except Exception as e:
            logger.error(f"[Twitter] Erreur search: {e}")
            return [], f"error:{str(e)}"


class ApifyTwitterCollector:
    """
    Collecte Twitter/X via Apify actor 2dZb9qNraqcbL8CXP (twitter-tweets-scraper).
    Apify gère les proxies résidentiels côté serveur — fonctionne depuis n'importe quelle IP.
    """
    ACTOR_ID = "2dZb9qNraqcbL8CXP"
    BASE_URL = "https://api.apify.com/v2"

    @classmethod
    async def search_tweets(
        cls,
        keywords: List[str],
        languages: List[str] = None,
        max_results: int = 50,
    ) -> Tuple[List[dict], str]:
        if not settings.apify_api_token:
            logger.warning("[Apify] Token non configuré")
            return [], "no_api_key"

        cache_key = f"apify:x:{''.join(keywords[:3])}"
        cached = memory_cache.get(cache_key)
        if cached:
            return cached, "cached"

        query = " OR ".join(keywords[:10])
        lang  = (languages or ["fr"])[0]

        from urllib.parse import quote
        # URL de recherche Twitter encodée
        search_url = f"https://twitter.com/search?q={quote(query)}&src=typed_query&f=live"
        input_data = {
            "startUrls": [search_url],
            "maxItems": max_results * 3,  # marge pour le filtrage côté client
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{cls.BASE_URL}/acts/{cls.ACTOR_ID}/run-sync-get-dataset-items",
                    params={"token": settings.apify_api_token, "timeout": 90},
                    json=input_data,
                )
                resp.raise_for_status()
                data = resp.json()

            articles = []
            for item in data:
                if item.get("noResults"):
                    continue
                tweet_id   = str(item.get("id_str") or item.get("id") or "")
                text       = item.get("full_text") or item.get("text") or ""
                user       = item.get("user") or {}
                legacy     = user.get("legacy") or user
                username   = legacy.get("screen_name") or legacy.get("name") or \
                             (item.get("url","").split("/")[3] if "/status/" in item.get("url","") else "unknown")
                created_at = item.get("created_at") or legacy.get("created_at") or ""
                likes      = item.get("favorite_count") or 0
                retweets   = item.get("retweet_count") or 0
                replies    = item.get("reply_count") or 0

                try:
                    pub_date = datetime.fromisoformat(created_at.replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    pub_date = datetime.utcnow()

                # Filtrage côté client — garder seulement les tweets avec au moins un mot-clé
                matched = [kw for kw in keywords if kw.lower() in text.lower()]
                if not matched:
                    continue

                uid = hashlib.sha256(f"apify:x:{tweet_id}".encode()).hexdigest()[:32]
                articles.append({
                    "uid": uid,
                    "source_id": "twitter",
                    "source_name": username,
                    "platform": "Twitter",
                    "title": text[:150],
                    "text": text,
                    "url": item.get("url") or f"https://twitter.com/{username}/status/{tweet_id}",
                    "author": username,
                    "thumbnail": None,
                    "lang": item.get("lang") or lang,
                    "published_at": pub_date,
                    "likes": likes,
                    "shares": retweets,
                    "comments": replies,
                    "matched_keywords": matched,
                    "engagement_score": likes * 1 + retweets * 2 + replies * 3,
                })
                if len(articles) >= max_results:
                    break

            memory_cache.set(cache_key, articles, ttl_seconds=600)
            logger.info(f"[Apify] {len(articles)} tweets collectés (filtrés par mots-clés)")
            return articles, "ok"

        except httpx.TimeoutException:
            logger.error("[Apify] Timeout — l'actor a pris trop de temps")
            return [], "timeout"
        except Exception as e:
            logger.error(f"[Apify] Erreur: {e}")
            return [], f"error:{str(e)}"


class OptimizedRedditCollector:
    """
    Collecteur Reddit — un seul appel par subreddit/query.
    Utilise pushshift alternative ou Reddit API direct.
    """
    
    @staticmethod
    async def search_subreddit(
        subreddit: str,
        keywords: List[str],
        sort: str = "hot",
        limit: int = 50
    ) -> Tuple[List[dict], str]:
        """
        Recherche dans un subreddit avec tri optimal.
        
        Sort options: hot, new, top
        """
        cache_key = f"reddit:{subreddit}:{sort}"
        cached = memory_cache.get(cache_key)
        if cached:
            return cached, "cached"
        
        # Pas d'API key requise pour les données publiques
        headers = {"User-Agent": "PNVD-Bot/1.0"}
        
        try:
            url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
            
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers, params={"limit": limit})
                response.raise_for_status()
                data = response.json()
            
            articles = []
            
            for item in data['data']['children']:
                if item['kind'] != 't3':  # Skip non-posts
                    continue
                
                post = item['data']
                title = post.get('title', '')
                text = post.get('selftext', '')[:1000]
                
                matched_kws = [kw for kw in keywords if kw.lower() in f"{title} {text}".lower()]
                
                # Seulement si mots-clés matchés
                if not matched_kws:
                    continue
                
                uid = hashlib.sha256(f"reddit:{post['id']}".encode()).hexdigest()[:32]
                
                articles.append({
                    "uid": uid,
                    "source_id": "reddit",
                    "source_name": f"/r/{subreddit}",
                    "platform": "Reddit",
                    "title": title,
                    "text": text,
                    "url": f"https://reddit.com{post['permalink']}",
                    "author": post.get('author', '[deleted]'),
                    "thumbnail": post.get('thumbnail') if post.get('thumbnail', '').startswith('http') else None,
                    "lang": "FR",
                    "published_at": datetime.fromtimestamp(post.get('created_utc', 0)),
                    "likes": post.get('ups', 0),
                    "shares": post.get('num_crossposts', 0),
                    "comments": post.get('num_comments', 0),
                    "matched_keywords": matched_kws,
                    "engagement_score": (
                        post.get('ups', 0) * 1 +
                        post.get('num_crossposts', 0) * 2 +
                        post.get('num_comments', 0) * 1.5
                    ),
                })
            
            memory_cache.set(cache_key, articles, ttl_seconds=1800)  # 30min
            logger.info(f"[Reddit] Collecté {len(articles)} posts de /r/{subreddit}")
            return articles, "ok"
        
        except Exception as e:
            logger.error(f"[Reddit] Erreur {subreddit}: {e}")
            return [], f"error:{str(e)}"


# Collecteurs optimisés globaux
optimized_youtube = OptimizedYouTubeCollector()
optimized_twitter = OptimizedTwitterCollector()
optimized_reddit = OptimizedRedditCollector()
