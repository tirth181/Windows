import {
  getAccessToken,
  clearTokens,
  setTokens,
  consumeAuthBounceGuard,
  isDemoToken,
} from "./auth";

// Prefer same-origin proxy (/api/v1 → ASP.NET) so public tunnels work without CORS.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "http://127.0.0.1:5080/api/v1");

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function forceLogoutAndRedirect(): Promise<void> {
  clearTokens();
  if (typeof window === "undefined") return;

  try {
    const { useAuthStore } = await import("@/stores/auth-store");
    useAuthStore.getState().logout();
  } catch {
    // ignore circular import / SSR edge cases
  }

  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/auth")) return;

  // Prevent login↔app hard-navigation loops when auth state is inconsistent
  if (!consumeAuthBounceGuard()) return;
  window.location.replace("/login");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = getAccessToken();

  // Keep Bearer token in sync with persisted zustand session (demo or real)
  if (!token && typeof window !== "undefined") {
    try {
      const { useAuthStore } = await import("@/stores/auth-store");
      const storeToken = useAuthStore.getState().token;
      if (storeToken) {
        setTokens(storeToken);
        token = storeToken;
      }
    } catch {
      // ignore
    }
  }

  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Demo sessions often hit a live API that rejects demo-token.
    // Never hard-redirect — let callers fall back to local demo data.
    if (isDemoToken(token) || path.startsWith("/auth/login")) {
      throw new ApiError(401, "Unauthorized");
    }

    await forceLogoutAndRedirect();
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const problem = (await response.json()) as {
        title?: string;
        detail?: string;
      };
      detail = problem.detail || problem.title;
    } catch {
      detail = undefined;
    }
    throw new ApiError(response.status, detail || response.statusText, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getApiBase(): string {
  return API_BASE;
}

/** Attempt an API call; return fallback when the API is unavailable. */
export async function apiFetchOrDemo<T>(
  path: string,
  fallback: T,
  options?: RequestInit,
): Promise<{ data: T; demo: boolean }> {
  try {
    const data = await apiFetch<T>(path, options);
    return { data, demo: false };
  } catch {
    return { data: fallback, demo: true };
  }
}
