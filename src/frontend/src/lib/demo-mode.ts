/**
 * Demo offline login is only allowed when explicitly enabled.
 * Production publishes should leave NEXT_PUBLIC_ALLOW_DEMO_LOGIN unset/false.
 */
export function isDemoLoginAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === "true";
}
