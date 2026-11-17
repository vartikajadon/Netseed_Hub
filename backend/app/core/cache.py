import time
import logging
from typing import Any, Optional, Dict
from cachetools import TTLCache

logger = logging.getLogger(__name__)

class AppTTLCache(TTLCache):
    """
    Enhanced TTLCache with standard .set(key, value) and .get(key) dictionary ergonomics.
    """
    def set(self, key: Any, value: Any) -> None:
        self[key] = value

# Lightweight in-memory TTL caches for high-traffic read paths
# Programs, Batches, Geofences change rarely -> 60s TTL
STATIC_METADATA_CACHE: AppTTLCache = AppTTLCache(maxsize=128, ttl=60.0)

# Aggregated Admin Dashboard metrics -> 15s TTL
DASHBOARD_METRICS_CACHE: AppTTLCache = AppTTLCache(maxsize=32, ttl=15.0)

# Geofence coordinates cache -> 120s TTL
GEOFENCE_CACHE: AppTTLCache = AppTTLCache(maxsize=32, ttl=120.0)

def get_cached(cache: TTLCache, key: str) -> Optional[Any]:
    """Retrieve an item from the given TTL cache."""
    try:
        return cache.get(key)
    except Exception:
        return None

def set_cached(cache: TTLCache, key: str, value: Any) -> None:
    """Store an item in the given TTL cache."""
    try:
        cache[key] = value
    except Exception:
        pass

def invalidate_cache(cache: TTLCache, key: Optional[str] = None) -> None:
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
