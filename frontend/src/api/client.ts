/// <reference types="vite/client" />

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    const rawMsg = err?.message || '';
    const friendlyMsg = (rawMsg === 'Failed to fetch' || rawMsg.includes('NetworkError') || rawMsg.includes('fetch'))
      ? 'Unable to connect to backend server at http://localhost:8000. Please ensure the backend is running.'
      : (rawMsg || 'Unable to connect to API server. Please ensure backend is running.');

    throw new ApiError(friendlyMsg, 0, { detail: rawMsg });
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
