/** Demo/offline login fallback — off in production unless explicitly enabled. */
export function allowDemoFallback(): boolean {
  const flag = process.env.NEXT_PUBLIC_ALLOW_DEMO_FALLBACK;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}
