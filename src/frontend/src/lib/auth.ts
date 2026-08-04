const TOKEN_KEY = "logiforge_access_token";
const REFRESH_KEY = "logiforge_refresh_token";
const AUTH_BOUNCE_KEY = "lf-auth-bounce";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

/** Clear one-shot redirect guard after a successful sign-in. */
export function clearAuthBounceGuard(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_BOUNCE_KEY);
}

export function consumeAuthBounceGuard(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(AUTH_BOUNCE_KEY)) return false;
  sessionStorage.setItem(AUTH_BOUNCE_KEY, "1");
  return true;
}

export function isDemoToken(token: string | null): boolean {
  return token === "demo-token";
}
