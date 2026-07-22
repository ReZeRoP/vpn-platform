'use client';

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '/api');

type AuthHandlers = {
  getTokens: () => { accessToken: string | null; refreshToken: string | null };
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
};

let authHandlers: AuthHandlers | null = null;
let refreshRequest: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export function configureApiAuth(handlers: AuthHandlers) {
  authHandlers = handlers;
}

function endpoint(path: string) {
  return `${API_ORIGIN.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function mediaUrl(url?: string | null) {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  if (API_ORIGIN.startsWith('http')) return `${new URL(API_ORIGIN).origin}/${url.replace(/^\//, '')}`;
  return url;
}

function errorMessage(body: unknown, status: number) {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const value = (body as { message?: unknown; error?: unknown }).message ??
      (body as { error?: unknown }).error;
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join('، ');
    if (typeof value === 'string') return value;
  }
  if (status === 401) return 'نشست شما منقضی شده است؛ دوباره وارد شوید';
  if (status === 403) return 'اجازه انجام این کار را ندارید';
  if (status === 404) return 'سرویس یا اطلاعات درخواستی در دسترس نیست';
  if (status >= 500) return 'خطایی در سرور رخ داد؛ کمی بعد دوباره تلاش کنید';
  return 'درخواست با خطا روبه‌رو شد';
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return undefined;
  if (contentType.includes('application/json')) return response.json().catch(() => undefined);
  return response.text().catch(() => undefined);
}

async function rotateToken() {
  if (!authHandlers?.getTokens().refreshToken) return false;
  if (!refreshRequest) {
    refreshRequest = (async () => {
      try {
        const response = await fetch(endpoint('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: authHandlers?.getTokens().refreshToken }),
        });
        const body = await parseResponse(response) as
          | { accessToken?: string; refreshToken?: string }
          | undefined;
        if (!response.ok || !body?.accessToken || !body.refreshToken) throw new Error();
        authHandlers?.setTokens(body.accessToken, body.refreshToken);
        return true;
      } catch {
        authHandlers?.clear();
        return false;
      } finally {
        refreshRequest = null;
      }
    })();
  }
  return refreshRequest;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const token = authHandlers?.getTokens().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(endpoint(path), { ...init, headers });
  } catch {
    throw new ApiError('ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید', 0);
  }
  if (response.status === 401 && retry && authHandlers?.getTokens().refreshToken) {
    if (await rotateToken()) return api<T>(path, init, false);
  }
  const body = await parseResponse(response);
  if (!response.ok) throw new ApiError(errorMessage(body, response.status), response.status, body);
  return body as T;
}

export function upload<T>(path: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return api<T>(path, { method: 'POST', body: form });
}

export function socketOrigin() {
  return API_ORIGIN.startsWith('http') ? new URL(API_ORIGIN).origin : undefined;
}
