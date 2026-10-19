/// <reference types="vite/client" />

export function getApiBaseUrl(): string {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // 1. Check custom override from localStorage
  if (typeof window !== 'undefined') {
    let localOverride = localStorage.getItem('api_base_url')?.trim();
    if (localOverride) {
      // If deployed on HTTPS, ignore insecure local/private IP overrides
      if (isHttps && (localOverride.startsWith('http://') || localOverride.includes('10.93.') || localOverride.includes('localhost'))) {
        localStorage.removeItem('api_base_url');
        localOverride = undefined;
      } else {
        let url = localOverride.replace(/\/+$/, '');
        if (!url.endsWith('/api/v1')) {
          url = `${url}/api/v1`;
        }
        return url;
      }
    }
  }

  // 2. Check environment variable VITE_API_BASE_URL
  let envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envUrl) {
    // If on HTTPS, ignore local private IPs that leak from .env
    if (isHttps && (envUrl.startsWith('http://') || envUrl.includes('10.93.') || envUrl.includes('localhost'))) {
      envUrl = undefined;
    } else {
      envUrl = envUrl.replace(/\/+$/, '');
      if (!envUrl.endsWith('/api/v1')) {
        envUrl = `${envUrl}/api/v1`;
      }
      return envUrl;
    }
  }

  // 3. Fallback for local development on localhost
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000/api/v1';
  }

  // 4. Default relative path for unified deployments
  return '/api/v1';
}

export function setApiBaseUrl(url: string | null) {
  if (typeof window === 'undefined') return;
  if (!url) {
    localStorage.removeItem('api_base_url');
  } else {
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api/v1')) {
      clean = `${clean}/api/v1`;
    }
    localStorage.setItem('api_base_url', clean);
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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${baseUrl}${cleanEndpoint}`;

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
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (isHttps && baseUrl.startsWith('http://')) {
        friendlyMsg = `Mixed Content Blocked: Your frontend is loaded over HTTPS, but the API URL is using unencrypted HTTP (${baseUrl}). Please click "Change Server" on the login screen and enter your secure Vercel backend URL (https://<your-backend>.vercel.app).`;
      } else if (baseUrl.includes('10.93.') || baseUrl.startsWith('http://localhost') || baseUrl.startsWith('http://127.0.0.1')) {
        friendlyMsg = `Unable to reach local backend at ${baseUrl}. If your backend is deployed on Vercel, please click "Change Server" on the login screen and paste your live Vercel backend URL (https://<your-backend>.vercel.app).`;
      } else {
        friendlyMsg = `Unable to connect to backend server at ${baseUrl}. Please check that your live backend Vercel service is online.`;
      }
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
  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
