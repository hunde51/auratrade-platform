const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:8000/api/v1";
const TOKEN_KEY = "auratrade_access_token";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  const nextHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers ?? {}),
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      nextHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: nextHeaders,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") {
        detail = payload.detail;
      } else if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
        detail = payload.detail[0]?.msg || detail;
      }
    } catch {
      // Keep default detail for non-json responses.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
