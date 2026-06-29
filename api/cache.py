"""
AERIS Cache Layer — Redis-backed with in-memory fallback

Primary: Redis (persistent, shared across workers, production-ready)
Fallback: In-memory LRU (when Redis is unavailable)

Features:
- Automatic Redis detection — uses Redis if available, falls back silently
- TTL-based expiration
- Namespace support (forecast:, attribution:, advisory:, snapshot:)
- JSON serialization for complex objects
- Stats tracking
- Multi-city ready (namespaced by city)
- Pub/Sub ready for cache invalidation across workers
"""

import os
import time
import json
import threading
from typing import Any, Optional, Dict, List
from collections import OrderedDict
from dataclasses import dataclass, field

# Redis config from environment
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
REDIS_PREFIX = "aeris:"  # All keys prefixed to avoid collisions


# ─── TTL Constants (seconds) ─────────────────────────────

class CacheTTL:
    """Standard TTL values for different data types."""
    CURRENT_AQI = 3600          # 1 hour
    FORECAST = 21600            # 6 hours
    ATTRIBUTION = 21600         # 6 hours
    ENFORCEMENT = 21600         # 6 hours
    ADVISORY_LLM = 7200         # 2 hours
    STATION_META = 86400        # 24 hours
    SNAPSHOT = 3600             # 1 hour (aggregate)
    CITY_INDEX = 86400          # 24 hours


# ─── Redis Cache ─────────────────────────────────────────

class RedisCache:
    """Redis-backed cache with JSON serialization."""

    def __init__(self, url: str = REDIS_URL):
        import redis
        self._redis = redis.from_url(url, decode_responses=True)
        self._stats = {"hits": 0, "misses": 0, "sets": 0}
        # Test connection
        self._redis.ping()
        print(f"✓ Redis cache connected: {url}")

    def get(self, key: str) -> Optional[Any]:
        """Get value by key."""
        full_key = f"{REDIS_PREFIX}{key}"
        raw = self._redis.get(full_key)
        if raw is None:
            self._stats["misses"] += 1
            return None
        self._stats["hits"] += 1
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Set value with TTL."""
        full_key = f"{REDIS_PREFIX}{key}"
        serialized = json.dumps(value, ensure_ascii=False, default=str)
        self._redis.setex(full_key, ttl_seconds, serialized)
        self._stats["sets"] += 1

    def delete(self, key: str) -> bool:
        """Delete a key."""
        full_key = f"{REDIS_PREFIX}{key}"
        return bool(self._redis.delete(full_key))

    def exists(self, key: str) -> bool:
        """Check if key exists."""
        full_key = f"{REDIS_PREFIX}{key}"
        return bool(self._redis.exists(full_key))

    def get_namespaced(self, namespace: str, key: str) -> Optional[Any]:
        return self.get(f"{namespace}:{key}")

    def set_namespaced(self, namespace: str, key: str, value: Any, ttl_seconds: int = 3600):
        self.set(f"{namespace}:{key}", value, ttl_seconds)

    def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple keys via pipeline."""
        pipe = self._redis.pipeline()
        full_keys = [f"{REDIS_PREFIX}{k}" for k in keys]
        for fk in full_keys:
            pipe.get(fk)
        results = pipe.execute()

        output = {}
        for key, raw in zip(keys, results):
            if raw is not None:
                self._stats["hits"] += 1
                try:
                    output[key] = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    output[key] = raw
            else:
                self._stats["misses"] += 1
        return output

    def set_many(self, items: Dict[str, Any], ttl_seconds: int = 3600) -> None:
        """Set multiple key-value pairs via pipeline."""
        pipe = self._redis.pipeline()
        for key, value in items.items():
            full_key = f"{REDIS_PREFIX}{key}"
            serialized = json.dumps(value, ensure_ascii=False, default=str)
            pipe.setex(full_key, ttl_seconds, serialized)
        pipe.execute()
        self._stats["sets"] += len(items)

    def invalidate_namespace(self, namespace: str) -> int:
        """Delete all keys in a namespace using SCAN (non-blocking)."""
        pattern = f"{REDIS_PREFIX}{namespace}:*"
        count = 0
        cursor = 0
        while True:
            cursor, keys = self._redis.scan(cursor, match=pattern, count=100)
            if keys:
                self._redis.delete(*keys)
                count += len(keys)
            if cursor == 0:
                break
        return count

    def clear(self) -> None:
        """Clear all AERIS keys (not entire Redis DB)."""
        self.invalidate_namespace("")

    def cleanup_expired(self) -> int:
        """Redis handles TTL expiration automatically."""
        return 0

    @property
    def stats(self) -> Dict[str, Any]:
        total = self._stats["hits"] + self._stats["misses"]
        hit_rate = self._stats["hits"] / total * 100 if total > 0 else 0
        # Get actual key count from Redis
        info = self._redis.info("keyspace")
        db_keys = 0
        for db_info in info.values():
            if isinstance(db_info, dict):
                db_keys += db_info.get("keys", 0)
        return {
            **self._stats,
            "evictions": 0,
            "size": db_keys,
            "max_size": "unlimited",
            "hit_rate_pct": round(hit_rate, 1),
            "backend": "redis",
        }

    @property
    def size(self) -> int:
        pattern = f"{REDIS_PREFIX}*"
        count = 0
        cursor = 0
        while True:
            cursor, keys = self._redis.scan(cursor, match=pattern, count=500)
            count += len(keys)
            if cursor == 0:
                break
        return count

    def publish(self, channel: str, message: Dict) -> None:
        """Publish message to Redis Pub/Sub (for multi-worker invalidation)."""
        self._redis.publish(
            f"{REDIS_PREFIX}channel:{channel}",
            json.dumps(message, default=str),
        )

    def get_ttl(self, key: str) -> int:
        """Get remaining TTL for a key in seconds."""
        full_key = f"{REDIS_PREFIX}{key}"
        return self._redis.ttl(full_key)


# ─── In-Memory Fallback Cache ─────────────────────────────

@dataclass
class CacheEntry:
    value: Any
    expires_at: float
    created_at: float = field(default_factory=time.time)


class InMemoryCache:
    """In-memory LRU cache — fallback when Redis is unavailable."""

    def __init__(self, max_size: int = 10000):
        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._max_size = max_size
        self._lock = threading.RLock()
        self._stats = {"hits": 0, "misses": 0, "sets": 0, "evictions": 0}

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._stats["misses"] += 1
                return None
            if time.time() > entry.expires_at:
                del self._store[key]
                self._stats["misses"] += 1
                return None
            self._store.move_to_end(key)
            self._stats["hits"] += 1
            return entry.value

    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        with self._lock:
            while len(self._store) >= self._max_size:
                self._store.popitem(last=False)
                self._stats["evictions"] += 1
            self._store[key] = CacheEntry(
                value=value, expires_at=time.time() + ttl_seconds
            )
            self._store.move_to_end(key)
            self._stats["sets"] += 1

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def exists(self, key: str) -> bool:
        return self.get(key) is not None

    def get_namespaced(self, namespace: str, key: str) -> Optional[Any]:
        return self.get(f"{namespace}:{key}")

    def set_namespaced(self, namespace: str, key: str, value: Any, ttl_seconds: int = 3600):
        self.set(f"{namespace}:{key}", value, ttl_seconds)

    def get_many(self, keys: List[str]) -> Dict[str, Any]:
        return {k: v for k in keys if (v := self.get(k)) is not None}

    def set_many(self, items: Dict[str, Any], ttl_seconds: int = 3600) -> None:
        for key, value in items.items():
            self.set(key, value, ttl_seconds)

    def invalidate_namespace(self, namespace: str) -> int:
        with self._lock:
            prefix = f"{namespace}:"
            to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in to_delete:
                del self._store[k]
            return len(to_delete)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def cleanup_expired(self) -> int:
        with self._lock:
            now = time.time()
            expired = [k for k, v in self._store.items() if now > v.expires_at]
            for k in expired:
                del self._store[k]
            return len(expired)

    @property
    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = self._stats["hits"] + self._stats["misses"]
            hit_rate = self._stats["hits"] / total * 100 if total > 0 else 0
            return {
                **self._stats,
                "size": len(self._store),
                "max_size": self._max_size,
                "hit_rate_pct": round(hit_rate, 1),
                "backend": "memory",
            }

    @property
    def size(self) -> int:
        return len(self._store)

    def publish(self, channel: str, message: Dict) -> None:
        """No-op for in-memory (no pub/sub without Redis)."""
        pass

    def get_ttl(self, key: str) -> int:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return -2
            remaining = entry.expires_at - time.time()
            return int(remaining) if remaining > 0 else -1


# ─── Smart Cache Factory ─────────────────────────────────

_cache_instance = None


def get_cache():
    """
    Get or create cache instance.
    Tries Redis first, falls back to in-memory.
    """
    global _cache_instance
    if _cache_instance is not None:
        return _cache_instance

    # Try Redis
    try:
        _cache_instance = RedisCache(REDIS_URL)
        return _cache_instance
    except Exception as e:
        print(f"⚠ Redis unavailable ({e}), using in-memory fallback")
        _cache_instance = InMemoryCache(max_size=10000)
        return _cache_instance
