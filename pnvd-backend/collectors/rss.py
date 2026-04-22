"""
PNVD Backend — Collecteur RSS
Collecte les flux RSS des médias sénégalais via rss2json (proxy CORS-free)
ou feedparser en direct selon l'environnement.
"""
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional
import httpx
import feedparser
from core.nlp import analyze_article, infer_region, detect_language, infer_sentiment

logger = logging.getLogger("pnvd.rss")

RSS_SOURCES = [
    {"id": "dakaractu",   "name": "Dakaractu",     "url": "https://www.dakaractu.com/feed/",            "lang": "FR"},
    {"id": "seneweb",     "name": "Seneweb",        "url": "https://www.seneweb.com/news/rss.php",        "lang": "FR"},
    {"id": "leral",       "name": "Leral.net",      "url": "https://www.leral.net/feed/",                "lang": "FR"},
    {"id": "senenews",    "name": "Senenews",       "url": "https://www.senenews.com/feed/",             "lang": "FR"},
    {"id": "xibaaru",     "name": "Xibaaru",        "url": "https://xibaaru.com/feed/",                  "lang": "WOL"},
    {"id": "pressafrik",  "name": "Pressafrik",     "url": "https://www.pressafrik.com/feed/",           "lang": "FR"},
    {"id": "rfisen",      "name": "RFI Sénégal",    "url": "https://www.rfi.fr/af/afrique/senegal/rss",  "lang": "FR"},
    {"id": "actusen",     "name": "Actusen",        "url": "https://actusen.sn/feed/",                   "lang": "FR"},
    {"id": "sudquot",     "name": "Sud Quotidien",  "url": "https://www.sudquotidien.sn/feed/",          "lang": "FR"},
    {"id": "walf",        "name": "Walf Quotidien", "url": "https://www.walf-groupe.com/feed/",          "lang": "FR"},
    {"id": "emedia",      "name": "Emedia",         "url": "https://emedia.sn/feed/",                    "lang": "FR"},
    {"id": "rewmi",       "name": "Rewmi",          "url": "https://www.rewmi.com/feed/",                "lang": "FR"},
]


def make_uid(url: str, source_id: str) -> str:
    """Génère un identifiant unique reproductible pour la déduplication."""
    return hashlib.sha256(f"{source_id}:{url}".encode()).hexdigest()[:32]


def clean_html(text: str) -> str:
    """Supprime les balises HTML d'une chaîne."""
    import re
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_date(raw: str) -> datetime:
    """Parse une date RSS en datetime UTC."""
    try:
        import email.utils
        parsed = email.utils.parsedate_to_datetime(raw)
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()


def find_thumbnail(entry: dict) -> Optional[str]:
    """Tente d'extraire une image de l'entrée RSS."""
    # media:thumbnail
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        return entry.media_thumbnail[0].get('url')
    # enclosures
    if hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get('type', '').startswith('image/'):
                return enc.get('href') or enc.get('url')
    # media:content
    if hasattr(entry, 'media_content') and entry.media_content:
        return entry.media_content[0].get('url')
    return None


async def fetch_rss_source(source: dict, keywords: list[str]) -> tuple[list[dict], str]:
    """
    Collecte un flux RSS.
    Retourne (liste d'articles bruts, statut).
    """
    source_id = source["id"]
    url = source["url"]
    articles = []

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            headers = {"User-Agent": "PNVD-Bot/1.0 (Plateforme Nationale de Veille Digitale)"}
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            content = resp.text
    except httpx.TimeoutException:
        logger.warning(f"[{source_id}] Timeout")
        return [], "timeout"
    except Exception as e:
        logger.warning(f"[{source_id}] Erreur HTTP: {e}")
        return [], f"error:{e}"

    try:
        feed = feedparser.parse(content)
    except Exception as e:
        logger.error(f"[{source_id}] Erreur parsing: {e}")
        return [], f"parse_error:{e}"

    if not feed.entries:
        return [], "empty"

    for entry in feed.entries[:15]:
        try:
            title = entry.get("title", "").strip()
            raw_summary = entry.get("summary", "") or entry.get("description", "")
            text = clean_html(raw_summary).strip()[:1000]
            link = entry.get("link", "")

            if not link or not title:
                continue

            uid = make_uid(link, source_id)
            published = parse_date(entry.get("published", "")) if entry.get("published") else datetime.utcnow()
            thumbnail = find_thumbnail(entry)
            author = entry.get("author", source["name"])

            full_text = f"{title} {text}"
            matched_kws = [kw for kw in keywords if kw.lower() in full_text.lower()]

            articles.append({
                "uid": uid,
                "source_id": source_id,
                "source_name": source["name"],
                "platform": "Presse",
                "title": title,
                "text": text,
                "url": link,
                "author": author,
                "thumbnail": thumbnail,
                "lang": source.get("lang", "FR"),
                "published_at": published,
                "matched_keywords": matched_kws,
            })
        except Exception as e:
            logger.debug(f"[{source_id}] Entrée ignorée: {e}")
            continue

    logger.info(f"[{source_id}] {len(articles)} articles collectés")
    return articles, "ok"


async def fetch_gdelt(keywords: list[str]) -> list[dict]:
    """
    Collecte via GDELT Project — articles mondiaux filtrés Sénégal.
    API gratuite, pas de clé requise.
    """
    # Jusqu'à 8 mots-clés, FR + EN, ancrage géographique strict
    kw_query = " OR ".join(keywords[:8]) if keywords else "Sénégal"
    query = f"({kw_query}) country:senegal (sourcelang:french OR sourcelang:english)"
    url = "http://api.gdeltproject.org/api/v2/doc/doc"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params={
                "query": query,
                "mode": "ArtList",
                "maxrecords": 15,
                "format": "json",
            })
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning(f"[GDELT] Erreur: {e}")
        return []

    articles = []
    for item in data.get("articles", []):
        try:
            raw_date = item.get("seendate", "")
            # Format GDELT: 20240115T120000Z
            import re
            m = re.match(r'(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z', raw_date)
            published = datetime(*[int(g) for g in m.groups()]) if m else datetime.utcnow()

            title = item.get("title", "").strip()
            link = item.get("url", "")
            if not link or not title:
                continue

            matched_kws = [kw for kw in keywords if kw.lower() in title.lower()]
            articles.append({
                "uid": make_uid(link, "gdelt"),
                "source_id": "gdelt",
                "source_name": item.get("domain", "GDELT"),
                "platform": "Web",
                "title": title,
                "text": title,
                "url": link,
                "author": item.get("domain", ""),
                "thumbnail": None,
                "lang": "FR",
                "published_at": published,
                "matched_keywords": matched_kws,
            })
        except Exception:
            continue

    logger.info(f"[GDELT] {len(articles)} articles collectés")
    return articles


async def fetch_reddit(keywords: list[str]) -> list[dict]:
    """Collecte Reddit — discussions publiques sur le Sénégal."""
    # Subreddits sénégalais/africains ciblés + recherche globale
    SENEGAL_SUBS = "Senegal+afrique+francophone+WestAfrica+Africa"
    SENEGAL_ANCHORS = {"sénégal", "senegal", "dakar", "thiès", "ziguinchor",
                       "saint-louis", "kaolack", "touba", "sonko", "macky"}

    # Jusqu'à 6 mots-clés avec ancrage Sénégal
    kw_part = " OR ".join(keywords[:6]) if keywords else "Sénégal"
    query = f"(Sénégal OR Senegal OR Dakar) ({kw_part})"
    url = "https://www.reddit.com/search.json"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {"User-Agent": "PNVD-Bot/1.0"}
            resp = await client.get(url, headers=headers, params={
                "q": query,
                "sort": "new",
                "limit": 15,
                "t": "week",
                "restrict_sr": False,
            })
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning(f"[Reddit] Erreur: {e}")
        return []

    articles = []
    for child in data.get("data", {}).get("children", []):
        post = child.get("data", {})
        title = post.get("title", "").strip()
        link = f"https://reddit.com{post.get('permalink', '')}"
        text = post.get("selftext", "")[:500]
        if not title:
            continue

        # Vérification post-collecte : le post doit mentionner le Sénégal
        full_text = f"{title} {text}".lower()
        if not any(anchor in full_text for anchor in SENEGAL_ANCHORS):
            continue

        matched_kws = [kw for kw in keywords if kw.lower() in full_text]

        articles.append({
            "uid": make_uid(link, "reddit"),
            "source_id": "reddit",
            "source_name": f"r/{post.get('subreddit', 'reddit')}",
            "platform": "Reddit",
            "title": title,
            "text": text,
            "url": link,
            "author": f"u/{post.get('author', '')}",
            "thumbnail": post.get("thumbnail") if post.get("thumbnail", "").startswith("http") else None,
            "lang": "FR",
            "published_at": datetime.utcfromtimestamp(post.get("created_utc", 0)),
            "matched_keywords": matched_kws,
            "likes": post.get("score", 0),
            "comments": post.get("num_comments", 0),
        })

    logger.info(f"[Reddit] {len(articles)} posts collectés")
    return articles


async def fetch_youtube(keywords: list[str], api_key: str) -> list[dict]:
    """Collecte YouTube — vidéos sénégalaises récentes."""
    if not api_key:
        return []

    # Jusqu'à 5 mots-clés + ancrage Sénégal explicite dans la requête
    kw_part = " ".join(keywords[:5]) if keywords else ""
    query = f"{kw_part} Sénégal".strip() if kw_part else "Sénégal actualité politique"
    url = "https://www.googleapis.com/youtube/v3/search"

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url, params={
                "part": "snippet",
                "q": query,
                "regionCode": "SN",       # Région de diffusion Sénégal
                "relevanceLanguage": "fr", # Préférence langue française
                "maxResults": 10,
                "order": "date",
                "type": "video",
                "key": api_key,
            })
            if resp.status_code == 403:
                logger.error("[YouTube] Quota dépassé ou clé invalide")
                return []
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning(f"[YouTube] Erreur: {e}")
        return []

    articles = []
    for item in data.get("items", []):
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId", "")
        if not video_id:
            continue

        title = snippet.get("title", "").strip()
        text = snippet.get("description", "").strip()[:500]
        link = f"https://youtube.com/watch?v={video_id}"
        full_text = f"{title} {text}"
        matched_kws = [kw for kw in keywords if kw.lower() in full_text.lower()]

        articles.append({
            "uid": make_uid(link, "youtube"),
            "source_id": "youtube",
            "source_name": snippet.get("channelTitle", "YouTube"),
            "platform": "YouTube",
            "title": title,
            "text": text,
            "url": link,
            "author": snippet.get("channelTitle", ""),
            "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
            "lang": "FR",
            "published_at": datetime.fromisoformat(snippet.get("publishedAt", "").replace("Z", "+00:00")).replace(tzinfo=None),
            "matched_keywords": matched_kws,
        })

    logger.info(f"[YouTube] {len(articles)} vidéos collectées")
    return articles


async def fetch_twitter(keywords: list[str], bearer_token: str) -> list[dict]:
    """Collecte X/Twitter — tweets récents sur le Sénégal."""
    if not bearer_token:
        return []

    # Ancres géographiques et hashtags sénégalais incontournables
    SENEGAL_ANCHOR = "(Sénégal OR Senegal OR Dakar OR #SenPol OR #Sénégal OR #senegal OR #DakarActu)"

    # Jusqu'à 6 mots-clés utilisateur (avec guillemets pour les expressions multi-mots)
    kw_terms = []
    for kw in keywords[:6]:
        kw_terms.append(f'"{kw}"' if " " in kw else kw)
    kw_part = f"({' OR '.join(kw_terms)})" if kw_terms else ""

    # Langues : FR (dominant) + EN (couverture internationale)
    # Wolof n'a pas de code lang supporté par Twitter API
    lang_filter = "(lang:fr OR lang:en)"

    # Construction de la requête finale
    if kw_part:
        query = f"{kw_part} {SENEGAL_ANCHOR} {lang_filter} -is:retweet"
    else:
        query = f"{SENEGAL_ANCHOR} {lang_filter} -is:retweet"

    # L'API Twitter limite les requêtes à 512 caractères
    query = query[:512]

    url = "https://api.twitter.com/2/tweets/search/recent"

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url,
                headers={"Authorization": f"Bearer {bearer_token}"},
                params={
                    "query": query,
                    "max_results": 25,
                    "tweet.fields": "created_at,public_metrics,author_id,lang,geo",
                    "expansions": "author_id,geo.place_id",
                    "user.fields": "name,username,location",
                    "place.fields": "country_code,full_name",
                }
            )
            if resp.status_code in (401, 403):
                logger.error("[Twitter] Token invalide ou accès refusé")
                return []
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning(f"[Twitter] Erreur: {e}")
        return []

    # Mots Sénégal pour post-filtrage de sécurité
    SENEGAL_TERMS = {"sénégal", "senegal", "dakar", "thiès", "ziguinchor",
                     "saint-louis", "kaolack", "touba", "sonko", "macky",
                     "#senpol", "#sénégal", "#senegal", "#dakaractu"}

    # Construire les mappings user_id → user et place_id → place
    includes = data.get("includes", {})
    users = {u["id"]: u for u in includes.get("users", [])}
    places = {p["id"]: p for p in includes.get("places", [])}

    articles = []
    for tweet in data.get("data", []):
        tweet_id = tweet["id"]
        text = tweet.get("text", "").strip()
        if not text:
            continue

        # Post-filtrage : le tweet doit mentionner le Sénégal (sauf si géolocalisé SN)
        text_lower = text.lower()
        place_id = tweet.get("geo", {}).get("place_id", "")
        place = places.get(place_id, {})
        is_sn_geo = place.get("country_code", "").upper() == "SN"
        if not is_sn_geo and not any(t in text_lower for t in SENEGAL_TERMS):
            continue

        author_id = tweet.get("author_id", "")
        user = users.get(author_id, {})
        username = user.get("username", "")
        location = user.get("location", "")
        link = f"https://twitter.com/{username}/status/{tweet_id}"
        metrics = tweet.get("public_metrics", {})
        matched_kws = [kw for kw in keywords if kw.lower() in text_lower]

        articles.append({
            "uid": make_uid(tweet_id, "twitter"),
            "source_id": "twitter",
            "source_name": f"@{username}",
            "platform": "Twitter",
            "title": text[:100],
            "text": text,
            "url": link,
            "author": f"@{username}" + (f" · {location}" if location else ""),
            "thumbnail": None,
            "lang": tweet.get("lang", "fr").upper()[:3],
            "published_at": datetime.fromisoformat(tweet.get("created_at", "").replace("Z", "+00:00")).replace(tzinfo=None),
            "matched_keywords": matched_kws,
            "likes": metrics.get("like_count", 0),
            "shares": metrics.get("retweet_count", 0),
            "comments": metrics.get("reply_count", 0),
        })

    logger.info(f"[Twitter] {len(articles)} tweets collectés (post-filtrés)")
    return articles
