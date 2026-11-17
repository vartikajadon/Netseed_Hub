/// <reference types="vite/client" />

import { toFriendlyErrorMessage } from '../utils/errorFormatter';

export const FIXED_BACKEND_API_URL = 'https://netseed-hub.vercel.app/api/v1';

export function getApiBaseUrl(): string {
  // 1. If running locally in development, target local backend API engine via direct IPv4 to eliminate Windows localhost IPv6 resolution lag
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.');
    if (isLocal) {
      return 'http://127.0.0.1:8000/api/v1';
    }

    // 2. If running deployed on the exact host netseed-hub.vercel.app, use relative /api/v1
    // This leverages HTTP/2 multiplexing and eliminates CORS OPTIONS preflight latency entirely
    if (host === 'netseed-hub.vercel.app') {
      return '/api/v1';
    }
  }

  // 3. If an environment variable is explicitly supplied (e.g. at build or in deployment), respect it
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) {
    let clean = envUrl.replace(/\/+$/, '');
    if (!clean.endsWith('/api/v1')) {
      clean = `${clean}/api/v1`;
    }
    return clean;
  }

  // Clear any obsolete localStorage overrides from previous versions
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api_base_url');
  }

  // Fixed backend link behind the scenes
  return FIXED_BACKEND_API_URL;
}

export function setApiBaseUrl(_url: string | null) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api_base_url');
  }
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  bypassCache?: boolean;
  cacheTtlMs?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

// In-memory & session cache for ultra-fast instantaneous navigation & deduplication
const memoryCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<any>>();
const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh TTL
const STALE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes max stale age for SWR instant rendering
const SESSION_CACHE_PREFIX = 'ns_c_';

// Endpoints that should never be cached or served stale
const NEVER_CACHE_PATTERNS = [
  '/attendance/liveness-challenge',
  '/attendance/verify-face',
  '/attendance/enroll-face',
  '/auth/refresh',
  '/system/time',
];

// Pre-warm backend serverless instance and connection pool on page boot
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try {
      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/health`, { mode: 'cors' }).catch(() => {});
    } catch {}
  }, 150);

  // Keep serverless instance warm every 4 minutes while tab is active to eliminate 3-8s cold starts
  setInterval(() => {
    if (!document.hidden) {
      try {
        const baseUrl = getApiBaseUrl();
        fetch(`${baseUrl}/health`, { mode: 'cors' }).catch(() => {});
      } catch {}
    }
  }, 4 * 60 * 1000);
}

function getSessionCache<T>(key: string, ttl: number): { data: T; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < ttl) {
      return { data: entry.data as T, timestamp: entry.timestamp };
    }
  } catch {}
  return null;
}

function setSessionCache(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {}
}

function clearSessionCache(prefix?: string) {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SESSION_CACHE_PREFIX)) {
        if (!prefix || k.includes(prefix)) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    clearSessionCache();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(prefix)) {
      memoryCache.delete(key);
    }
  }
  clearSessionCache(prefix);
}

// Background revalidation for Stale-While-Revalidate pattern
function triggerBackgroundRevalidation<T>(
  cleanEndpoint: string,
  cacheKey: string,
  options: RequestOptions
) {
  if (inflightRequests.has(cacheKey)) return;
  request<T>(cleanEndpoint, { ...options, bypassCache: true })
    .then((fresh) => {
      memoryCache.set(cacheKey, { data: fresh, timestamp: Date.now() });
      setSessionCache(cacheKey, fresh);
    })
    .catch(() => {
      // Non-blocking: background revalidation failure keeps current view stable
    });
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const isNeverCache = NEVER_CACHE_PATTERNS.some((pat) => cleanEndpoint.includes(pat));
  const bypassCache = (options.bypassCache ?? false) || isNeverCache;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  const cacheKey = `${token || 'anon'}:${cleanEndpoint}`;

  // 1. Stale-While-Revalidate (SWR) & In-flight Deduplication for GET requests
  if (isGet && !bypassCache) {
    const now = Date.now();
    const cached = memoryCache.get(cacheKey);

    if (cached) {
      // If fresh, return immediately
      if (now - cached.timestamp < cacheTtlMs) {
        return cached.data as T;
      }
      // If stale but within STALE_MAX_AGE_MS, return immediately and revalidate in background
      if (now - cached.timestamp < STALE_MAX_AGE_MS) {
        triggerBackgroundRevalidation<T>(cleanEndpoint, cacheKey, options);
        return cached.data as T;
      }
    }

    const sessionCached = getSessionCache<T>(cacheKey, STALE_MAX_AGE_MS);
    if (sessionCached) {
      memoryCache.set(cacheKey, sessionCached);
      if (now - sessionCached.timestamp < cacheTtlMs) {
        return sessionCached.data;
      }
      triggerBackgroundRevalidation<T>(cleanEndpoint, cacheKey, options);
      return sessionCached.data;
    }

    if (inflightRequests.has(cacheKey)) {
      return inflightRequests.get(cacheKey) as Promise<T>;
    }
  }


  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const baseUrl = getApiBaseUrl();
  const targetUrl = `${baseUrl}${cleanEndpoint}`;

  const fetchPromise = (async () => {
    let response: Response;
    try {
      response = await fetch(targetUrl, {
        ...options,
        headers,
      });
    } catch (err: any) {
      const rawMsg = err?.message || '';
      const friendlyMsg = toFriendlyErrorMessage(rawMsg, 0, { detail: rawMsg, targetUrl });
      throw new ApiError(friendlyMsg, 0, { detail: rawMsg, targetUrl });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const friendlyHtmlMsg = toFriendlyErrorMessage('Received HTML instead of API response', response.status);
      throw new ApiError(friendlyHtmlMsg, response.status);
    }

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }

      let rawMessage = 'An unexpected API error occurred';
      if (typeof errorData.detail === 'string') {
        rawMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        rawMessage = errorData.detail
          .map((d: any) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
          .join('; ');
      } else if (errorData.detail && typeof errorData.detail === 'object') {
        rawMessage = JSON.stringify(errorData.detail);
      } else if (typeof errorData.message === 'string') {
        rawMessage = errorData.message;
      }

      const message = toFriendlyErrorMessage(rawMessage, response.status, errorData);

      if (response.status === 403 && typeof message === 'string' && message.includes('ACCESS_REVOKED')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('access_revoked'));
        }
      }

      throw new ApiError(message, response.status, errorData);
    }

    if (response.status === 204) return {} as T;
    const result = await response.json();

    // Cache successful GET results
    if (isGet) {
      memoryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      setSessionCache(cacheKey, result);
    }


    return result as T;
  })();

  if (isGet && !bypassCache) {
    inflightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      inflightRequests.delete(cacheKey);
    });
  }

  return fetchPromise;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, { method: 'GET', ...options }),
  post: <T>(endpoint: string, data: any, options?: RequestOptions) => {
    clearApiCache();
    return request<T>(endpoint, { method: 'POST', body: JSON.stringify(data), ...options });
  },
  put: <T>(endpoint: string, data: any, options?: RequestOptions) => {
    clearApiCache();
    return request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data), ...options });
  },
  patch: <T>(endpoint: string, data: any, options?: RequestOptions) => {
    clearApiCache();
    return request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data), ...options });
  },
  delete: <T>(endpoint: string, options?: RequestOptions) => {
    clearApiCache();
    return request<T>(endpoint, { method: 'DELETE', ...options });
  },
  upload: <T>(endpoint: string, formData: FormData, options?: RequestOptions) => {
    clearApiCache();
    return request<T>(endpoint, { method: 'POST', body: formData, ...options });
  },
  clearCache: (prefix?: string) => clearApiCache(prefix),
};
