import time
import logging
from typing import Any, Optional, Dict, Tuple

logger = logging.getLogger(__name__)

class AppTTLCache:
    """
    High-performance, in-memory TTL Cache with zero external dependencies.
    Provides standard .set(key, value) and .get(key) dictionary semantics with TTL expiration.
    """
    def __init__(self, maxsize: int = 128, ttl: float = 60.0):
        self.maxsize = maxsize
        self.ttl = ttl
        self._cache: Dict[Any, Tuple[float, Any]] = {}

    def get(self, key: Any, default: Any = None) -> Any:
        now = time.time()
        if key in self._cache:
            expires_at, val = self._cache[key]
            if now < expires_at:
                return val
            else:
                del self._cache[key]
        return default

    def set(self, key: Any, value: Any, ttl: Optional[float] = None) -> None:
        now = time.time()
        actual_ttl = ttl if ttl is not None else self.ttl
        if len(self._cache) >= self.maxsize and key not in self._cache:
            # Purge expired items first
            expired_keys = [k for k, (exp, _) in self._cache.items() if now >= exp]
            for k in expired_keys:
                del self._cache[k]
            # If still full, pop the oldest inserted item
            if len(self._cache) >= self.maxsize:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
        self._cache[key] = (now + actual_ttl, value)

    def __getitem__(self, key: Any) -> Any:
        val = self.get(key)
        if val is None:
            raise KeyError(key)
        return val

    def __setitem__(self, key: Any, value: Any) -> None:
        self.set(key, value)

    def __contains__(self, key: Any) -> bool:
        return self.get(key) is not None

    def pop(self, key: Any, default: Any = None) -> Any:
        now = time.time()
        if key in self._cache:
            expires_at, val = self._cache.pop(key)
            if now < expires_at:
                return val
        return default

    def clear(self) -> None:
        self._cache.clear()

    def __len__(self) -> int:
        now = time.time()
        return sum(1 for exp, _ in self._cache.values() if now < exp)


# Alias for backward compatibility if any module imports TTLCache
TTLCache = AppTTLCache

# Lightweight in-memory TTL caches for high-traffic read paths
# Programs, Batches, Geofences change rarely -> 60s TTL
STATIC_METADATA_CACHE: AppTTLCache = AppTTLCache(maxsize=128, ttl=60.0)

# Aggregated Admin Dashboard metrics -> 15s TTL
DASHBOARD_METRICS_CACHE: AppTTLCache = AppTTLCache(maxsize=32, ttl=15.0)

# Geofence coordinates cache -> 120s TTL
GEOFENCE_CACHE: AppTTLCache = AppTTLCache(maxsize=32, ttl=120.0)

def get_cached(cache: AppTTLCache, key: str) -> Optional[Any]:
    """Retrieve an item from the given TTL cache."""
    try:
        return cache.get(key)
    except Exception:
        return None

def set_cached(cache: AppTTLCache, key: str, value: Any) -> None:
    """Store an item in the given TTL cache."""
    try:
        cache.set(key, value)
    except Exception:
        pass

def invalidate_cache(cache: AppTTLCache, key: Optional[str] = None) -> None:
    """Clear specific key or whole cache upon write mutations."""
    try:
        if key:
            cache.pop(key, None)
        else:
            cache.clear()
    except Exception:
        pass

def invalidate_all_static():
    """Clear metadata and dashboard caches on CRUD mutations."""
    STATIC_METADATA_CACHE.clear()
    DASHBOARD_METRICS_CACHE.clear()
    GEOFENCE_CACHE.clear()
