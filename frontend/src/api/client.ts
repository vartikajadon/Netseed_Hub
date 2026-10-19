/// <reference types="vite/client" />

export const FIXED_BACKEND_API_URL = 'https://netseed-hub.vercel.app/api/v1';

export function getApiBaseUrl(): string {
  // If running locally in development, target local backend API engine
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000/api/v1';
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
  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
