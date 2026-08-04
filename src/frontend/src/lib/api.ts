import { getAccessToken, clearTokens } from "./auth";

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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
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
    clearTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
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
