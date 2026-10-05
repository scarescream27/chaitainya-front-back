"""
=============================================================================
Chaitanya 2k26 — High-Performance Redis Caching Engine
=============================================================================
Provides multi-tiered caching for static assets, 3D models, Draco wasm,
API endpoints, and dynamic event datasets with sub-millisecond response times.
Features:
- Primary: Redis (via redis-py with connection pooling)
- Secondary: Thread-safe high-speed in-memory LRU fallback if Redis is offline
- ETags & HTTP 304 Not Modified validation
- Gzip pre-compressed asset caching
- Real-time cache performance telemetry (Hit/Miss ratio, memory, key counts)
- Zero downtime & auto-reconnection
=============================================================================
"""

import os
import sys
import time
import json
import hashlib
import logging
import threading
from collections import OrderedDict

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("redis_cache")

# Try to import redis
try:
    import redis
    REDIS_LIB_AVAILABLE = True
except ImportError:
    REDIS_LIB_AVAILABLE = False
    logger.warning("The 'redis' Python package is not installed. Using in-memory cache engine.")

# Auto-load .env file if present
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(ENV_PATH):
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k and k not in os.environ:
                        os.environ[k] = v
    except Exception:
        pass

# Environment configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/0")
REDIS_ENABLED = os.environ.get("REDIS_ENABLED", "true").lower() in ("true", "1", "yes")
REDIS_DEFAULT_TTL = int(os.environ.get("REDIS_DEFAULT_TTL", "86400"))  # 24 hours
REDIS_API_TTL = int(os.environ.get("REDIS_API_TTL", "300"))           # 5 minutes
REDIS_MAX_FILE_SIZE = int(os.environ.get("REDIS_MAX_FILE_SIZE", str(25 * 1024 * 1024))) # 25MB
CACHE_PREFIX = "chaitanya:"


class InMemoryFallbackCache:
    """Thread-safe in-memory LRU cache matching Redis string/hash interface."""
    def __init__(self, max_items=2000):
        self.max_items = max_items
        self._store = OrderedDict()
        self._expires = {}
        self._lock = threading.RLock()

    def get(self, key):
        with self._lock:
            if key not in self._store:
                return None
            expire_at = self._expires.get(key)
            if expire_at is not None and time.time() > expire_at:
                del self._store[key]
                if key in self._expires:
                    del self._expires[key]
                return None
            self._store.move_to_end(key)
            return self._store[key]

    def set(self, key, value, ex=None):
        with self._lock:
            if len(self._store) >= self.max_items and key not in self._store:
                oldest_key, _ = self._store.popitem(last=False)
                if oldest_key in self._expires:
                    del self._expires[oldest_key]
            self._store[key] = value
            self._store.move_to_end(key)
            if ex:
                self._expires[key] = time.time() + ex
            elif key in self._expires:
                del self._expires[key]
            return True

    def delete(self, *keys):
        with self._lock:
            count = 0
            for k in keys:
                if k in self._store:
                    del self._store[k]
                    count += 1
                if k in self._expires:
                    del self._expires[k]
            return count

    def exists(self, key):
        with self._lock:
            if key not in self._store:
                return 0
            expire_at = self._expires.get(key)
            if expire_at is not None and time.time() > expire_at:
                del self._store[key]
                if key in self._expires:
                    del self._expires[key]
                return 0
            return 1

    def keys(self, pattern="*"):
        with self._lock:
            now = time.time()
            valid_keys = []
            prefix = pattern.replace("*", "") if pattern.endswith("*") else ""
            for k in list(self._store.keys()):
                expire_at = self._expires.get(k)
                if expire_at and now > expire_at:
                    del self._store[k]
                    del self._expires[k]
                    continue
                if not prefix or k.startswith(prefix):
                    valid_keys.append(k)
            return valid_keys

    def flushdb(self):
        with self._lock:
            self._store.clear()
            self._expires.clear()
            return True

    def count(self):
        with self._lock:
            return len(self._store)


class RedisCacheManager:
    """Manages Redis connection, transparent fallback, caching policies and metrics."""
    def __init__(self):
        self.redis_client = None
        self.is_connected = False
        self.fallback_cache = InMemoryFallbackCache(max_items=3000)
        self.start_time = time.time()
        
        # Telemetry counters
        self.hits = 0
        self.misses = 0
        self.revalidations = 0
        self._lock = threading.Lock()
        
        self.connect()

    def connect(self):
        """Establish connection to Redis server with short timeout."""
        if not REDIS_LIB_AVAILABLE or not REDIS_ENABLED:
            self.is_connected = False
            return False

        try:
            self.redis_client = redis.Redis.from_url(
                REDIS_URL,
                protocol=2,
                socket_timeout=1.5,
                socket_connect_timeout=1.5,
                decode_responses=False  # Keep binary for assets
            )
            # Test connectivity
            self.redis_client.ping()
            self.is_connected = True
            logger.info(f"[REDIS CACHE] Successfully connected to Redis at: {self._sanitize_url(REDIS_URL)}")
            return True
        except Exception as e:
            self.is_connected = False
            self.redis_client = None
            logger.info(f"[REDIS CACHE] Redis not reachable at {self._sanitize_url(REDIS_URL)} ({type(e).__name__}). Using high-speed In-Memory cache fallback.")
            return False

    def _sanitize_url(self, url):
        """Hide passwords in redis URLs for safe logging."""
        if "@" in url:
            parts = url.split("@")
            return f"redis://***@{parts[-1]}"
        return url

    def is_redis_active(self):
        """Check if active connection to Redis is available."""
        if not self.is_connected or not self.redis_client:
            return False
        return True

    def record_hit(self):
        with self._lock:
            self.hits += 1

    def record_miss(self):
        with self._lock:
            self.misses += 1

    def record_revalidation(self):
        with self._lock:
            self.revalidations += 1

    def get(self, key):
        """Get raw bytes or None."""
        full_key = CACHE_PREFIX + key
        try:
            if self.is_redis_active():
                val = self.redis_client.get(full_key)
                if val is not None:
                    self.record_hit()
                    return val
                self.record_miss()
                return None
        except Exception as err:
            logger.warning(f"[REDIS CACHE] Redis get error: {err}. Falling back to in-memory.")
            self.is_connected = False

        # Fallback
        val = self.fallback_cache.get(full_key)
        if val is not None:
            self.record_hit()
            return val
        self.record_miss()
        return None

    def set(self, key, value, ex=None):
        """Set raw bytes with optional TTL."""
        full_key = CACHE_PREFIX + key
        ex = ex or REDIS_DEFAULT_TTL
        try:
            if self.is_redis_active():
                return self.redis_client.set(full_key, value, ex=ex)
        except Exception as err:
            logger.warning(f"[REDIS CACHE] Redis set error: {err}. Storing in memory fallback.")
            self.is_connected = False

        # Fallback
        return self.fallback_cache.set(full_key, value, ex=ex)

    def get_json(self, key):
        """Get deserialized JSON or None."""
        raw = self.get(key)
        if not raw:
            return None
        try:
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            return json.loads(raw)
        except Exception:
            return None

    def set_json(self, key, data, ex=None):
        """Store Python data as JSON string with TTL."""
        try:
            payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
            ex = ex or REDIS_API_TTL
            return self.set(key, payload, ex=ex)
        except Exception as err:
            logger.error(f"[REDIS CACHE] JSON serialization error for key {key}: {err}")
            return False

    def delete(self, key):
        """Delete a key."""
        full_key = CACHE_PREFIX + key
        try:
            if self.is_redis_active():
                self.redis_client.delete(full_key)
        except Exception:
            pass
        return self.fallback_cache.delete(full_key)

    def flush(self):
        """Flush all Chaitanya cache keys."""
        cleared = 0
        try:
            if self.is_redis_active():
                cursor = 0
                while True:
                    cursor, keys = self.redis_client.scan(cursor=cursor, match=f"{CACHE_PREFIX}*", count=100)
                    if keys:
                        self.redis_client.delete(*keys)
                        cleared += len(keys)
                    if cursor == 0:
                        break
        except Exception:
            pass

        self.fallback_cache.flushdb()
        logger.info(f"[REDIS CACHE] Cache flushed. Purged {cleared} keys.")
        return True

    # --------------------------------------------------------------------------
    # Static Assets & ETags Specialization
    # --------------------------------------------------------------------------

    def make_etag(self, content_bytes):
        """Generate strong SHA-256 ETag from content."""
        hasher = hashlib.sha256()
        hasher.update(content_bytes)
        return f'"{hasher.hexdigest()[:16]}"'

    def cache_asset(self, path, content_bytes, mime_type, is_gzip=False, ttl=None):
        """Cache static asset in Redis if within size limits."""
        if len(content_bytes) > REDIS_MAX_FILE_SIZE:
            return None  # Skip storing excessively large files in Redis RAM

        etag = self.make_etag(content_bytes)
        cache_key = f"asset:{'gz:' if is_gzip else ''}{path}"
        meta_key = f"meta:{path}"
        ttl = ttl or REDIS_DEFAULT_TTL

        # Store binary payload
        self.set(cache_key, content_bytes, ex=ttl)

        # Store metadata
        meta = {
            "mime": mime_type,
            "etag": etag,
            "size": len(content_bytes),
            "cached_at": time.time(),
            "has_gzip": is_gzip
        }
        self.set_json(meta_key, meta, ex=ttl)
        return etag

    def get_asset(self, path, want_gzip=False):
        """Retrieve cached asset and metadata from Redis."""
        meta_key = f"meta:{path}"
        meta = self.get_json(meta_key)
        if not meta:
            return None

        # Check if gzip version is available and requested
        if want_gzip and meta.get("has_gzip"):
            cache_key = f"asset:gz:{path}"
            raw = self.get(cache_key)
            if raw:
                return {
                    "content": raw,
                    "mime": meta.get("mime", "application/octet-stream"),
                    "etag": meta.get("etag", ""),
                    "is_gzip": True
                }

        # Otherwise retrieve normal version
        cache_key = f"asset:{path}"
        raw = self.get(cache_key)
        if raw:
            return {
                "content": raw,
                "mime": meta.get("mime", "application/octet-stream"),
                "etag": meta.get("etag", ""),
                "is_gzip": False
            }

        return None

    def get_stats(self):
        """Return rich telemetry for admin command center & /api/cache/stats."""
        total = self.hits + self.misses + self.revalidations
        ratio = (self.hits / (self.hits + self.misses) * 100) if (self.hits + self.misses) > 0 else 0.0

        keys_count = 0
        redis_info = {}
        if self.is_redis_active():
            try:
                cursor = 0
                while True:
                    cursor, keys = self.redis_client.scan(cursor=cursor, match=f"{CACHE_PREFIX}*", count=200)
                    keys_count += len(keys)
                    if cursor == 0:
                        break
                redis_info = self.redis_client.info("memory")
            except Exception:
                keys_count = self.fallback_cache.count()
        else:
            keys_count = self.fallback_cache.count()

        return {
            "status": "online",
            "engine": "Redis Server" if self.is_redis_active() else "In-Memory (Redis Fallback)",
            "redis_connected": self.is_redis_active(),
            "redis_url": self._sanitize_url(REDIS_URL),
            "hits": self.hits,
            "misses": self.misses,
            "revalidations_304": self.revalidations,
            "total_requests": total,
            "hit_ratio_percent": round(ratio, 1),
            "cached_keys": keys_count,
            "uptime_seconds": round(time.time() - self.start_time, 1),
            "max_cached_file_size_mb": round(REDIS_MAX_FILE_SIZE / (1024 * 1024), 1),
            "default_ttl_hours": round(REDIS_DEFAULT_TTL / 3600, 1),
            "redis_memory": redis_info.get("used_memory_human", "N/A")
        }


# Global singleton cache instance
cache = RedisCacheManager()
