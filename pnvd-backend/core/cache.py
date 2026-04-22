"""
PNVD Backend — Cache Manager (Multi-layer optimization)
Évite les requêtes redondantes avec TTL dynamique et delta sync.
"""
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Any
from sqlalchemy import select, delete
from core.database import AsyncSessionLocal
from core.config import settings

logger = logging.getLogger("pnvd.cache")


class CacheEntry:
    """Entrée de cache simple en mémoire avec TTL."""
    def __init__(self, value: Any, ttl_seconds: int = 3600):
        self.value = value
        self.created_at = datetime.utcnow()
        self.ttl_seconds = ttl_seconds
    
    def is_expired(self) -> bool:
        return (datetime.utcnow() - self.created_at).total_seconds() > self.ttl_seconds
    
    def __repr__(self):
        return f"CacheEntry(ttl={self.ttl_seconds}s, expired={self.is_expired()})"


class MemoryCache:
    """Cache en mémoire simple pour les collectes rapides."""
    def __init__(self):
        self._store = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Récupère une clé du cache si elle n'a pas expiré."""
        if key in self._store:
            entry = self._store[key]
            if not entry.is_expired():
                logger.debug(f"Cache HIT: {key}")
                return entry.value
            else:
                del self._store[key]
                logger.debug(f"Cache EXPIRED: {key}")
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Stocke une clé avec TTL."""
        self._store[key] = CacheEntry(value, ttl_seconds)
        logger.debug(f"Cache SET: {key} (ttl={ttl_seconds}s)")
    
    def delete(self, key: str) -> None:
        """Supprime une clé."""
        if key in self._store:
            del self._store[key]
    
    def clear_expired(self) -> int:
        """Supprime toutes les entrées expirées."""
        expired_keys = [k for k, v in self._store.items() if v.is_expired()]
        for key in expired_keys:
            del self._store[key]
        if expired_keys:
            logger.info(f"Nettoyage cache: {len(expired_keys)} entrées expirées supprimées")
        return len(expired_keys)


class PersistentCache:
    """Cache persisté en BD pour les longues synchronisations."""
    
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """Récupère depuis la BD si pas expiré."""
        async with AsyncSessionLocal() as db:
            # Importer ici pour éviter les dépendances circulaires
            from sqlalchemy import text
            result = await db.execute(
                text("SELECT value FROM cache_entries WHERE key = :key AND expires_at > datetime('now')"),
                {"key": key}
            )
            row = result.fetchone()
            if row:
                return json.loads(row[0])
        return None
    
    @staticmethod
    async def set(key: str, value: Any, ttl_hours: int = 1) -> None:
        """Stocke en BD avec expiration."""
        async with AsyncSessionLocal() as db:
            from sqlalchemy import text
            expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
            await db.execute(
                text("""
                    INSERT INTO cache_entries (key, value, expires_at)
                    VALUES (:key, :value, :expires_at)
                    ON CONFLICT(key) DO UPDATE SET
                        value = :value,
                        expires_at = :expires_at
                """),
                {"key": key, "value": json.dumps(value, ensure_ascii=False), "expires_at": expires_at}
            )
            await db.commit()


class SyncToken:
    """Gère les tokens de synchronisation delta (curseurs d'API)."""
    
    @staticmethod
    async def get_token(platform: str) -> Optional[str]:
        """Récupère le token de sync de la dernière collecte."""
        async with AsyncSessionLocal() as db:
            from sqlalchemy import text
            result = await db.execute(
                text("SELECT next_token FROM sync_tokens WHERE platform = :platform"),
                {"platform": platform}
            )
            row = result.fetchone()
            return row[0] if row else None
    
    @staticmethod
    async def save_token(platform: str, token: str, cursor: Optional[str] = None) -> None:
        """Sauvegarde le token pour la prochaine collecte."""
        async with AsyncSessionLocal() as db:
            from sqlalchemy import text
            await db.execute(
                text("""
                    INSERT INTO sync_tokens (platform, next_token, last_cursor, last_sync)
                    VALUES (:platform, :token, :cursor, datetime('now'))
                    ON CONFLICT(platform) DO UPDATE SET
                        next_token = :token,
                        last_cursor = :cursor,
                        last_sync = datetime('now')
                """),
                {"platform": platform, "token": token, "cursor": cursor}
            )
            await db.commit()


class DeduplicationManager:
    """Détecte et élimine les doublons multi-sources intelligemment."""
    
    @staticmethod
    def hash_content(title: str, text: str, source: str) -> str:
        """Génère un hash déterministe pour la déduplication."""
        content = f"{title}:{text}:{source}".lower().strip()
        return hashlib.md5(content.encode()).hexdigest()[:24]
    
    @staticmethod
    def similarity_score(text1: str, text2: str) -> float:
        """Compare deux textes (0.0-1.0)."""
        from difflib import SequenceMatcher
        # Limiter à 200 chars pour perf
        text1 = text1[:200].lower()
        text2 = text2[:200].lower()
        return SequenceMatcher(None, text1, text2).ratio()
    
    @staticmethod
    async def is_duplicate(article: dict, existing_uids: set) -> bool:
        """
        Vérifie si un article existe déjà.
        Critères : hash exact OU similarité > 0.85 dans même fenêtre temporelle (1h).
        """
        article_hash = DeduplicationManager.hash_content(
            article.get("title", ""),
            article.get("text", ""),
            article.get("source_id", "")
        )
        
        if article_hash in existing_uids:
            logger.debug(f"Duplicate detected (hash): {article_hash}")
            return True
        
        # Similarity check (coûteux, utiliser avec parcimonie)
        # À implémenter si necessary avec cache des hashes
        
        return False


# Instances globales
memory_cache = MemoryCache()
persistent_cache = PersistentCache()
sync_token = SyncToken()
dedup_manager = DeduplicationManager()
