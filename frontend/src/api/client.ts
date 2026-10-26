/// <reference types="vite/client" />

export const FIXED_BACKEND_API_URL = 'https://netseed-hub.vercel.app/api/v1';

export function getApiBaseUrl(): string {
  // If running locally in development, target local backend API engine via direct IPv4 to eliminate Windows localhost IPv6 resolution lag
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000/api/v1';
  }

  // If an environment variable is explicitly supplied (e.g. at build or in deployment), respect it
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
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
const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 60 seconds default TTL
const SESSION_CACHE_PREFIX = 'ns_c_';

function getSessionCache<T>(key: string, ttl: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < ttl) {
      return entry.data as T;
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

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const bypassCache = options.bypassCache ?? false;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cacheKey = `${token || 'anon'}:${cleanEndpoint}`;

  // 1. In-memory Cache, Session Cache & In-flight Deduplication for GET requests
  if (isGet && !bypassCache) {
    const now = Date.now();
    const cached = memoryCache.get(cacheKey);
    if (cached && now - cached.timestamp < cacheTtlMs) {
      return cached.data as T;
    }

    const sessionCached = getSessionCache<T>(cacheKey, cacheTtlMs);
    if (sessionCached) {
      memoryCache.set(cacheKey, { data: sessionCached, timestamp: now });
      return sessionCached;
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
      const isNetworkError = rawMsg === 'Failed to fetch' || rawMsg.includes('NetworkError') || rawMsg.includes('fetch');

      let friendlyMsg = rawMsg;
      if (isNetworkError) {
        friendlyMsg = `Unable to connect to backend server at ${baseUrl}. Please check that your live backend service is online.`;
      }

      throw new ApiError(friendlyMsg, 0, { detail: rawMsg, targetUrl });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new ApiError(
        `Received HTML instead of API response from ${targetUrl}. Please ensure your backend URL is configured to point to your live backend domain.`,
        response.status
      );
    }

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }

      let message = 'An unexpected API error occurred';
      if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        message = errorData.detail
          .map((d: any) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
          .join('; ');
      } else if (errorData.detail && typeof errorData.detail === 'object') {
        message = JSON.stringify(errorData.detail);
      } else if (typeof errorData.message === 'string') {
        message = errorData.message;
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
