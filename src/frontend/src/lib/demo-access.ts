const ACCESS_KEY = "logiforge_access_request";

export type AccessRequestRecord = {
  name: string;
  company: string;
  position: string;
  submittedAt: string;
};

export function isAccessRequestRequired(): boolean {
  // Default on for publish. Set NEXT_PUBLIC_REQUIRE_ACCESS_REQUEST=false for internal tenants.
  return process.env.NEXT_PUBLIC_REQUIRE_ACCESS_REQUEST !== "false";
}

export function hasCompletedAccessRequest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(sessionStorage.getItem(ACCESS_KEY));
  } catch {
    return false;
  }
}

export function markAccessRequestCompleted(record: AccessRequestRecord): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_KEY, JSON.stringify(record));
}

export function getAccessRequestRecord(): AccessRequestRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACCESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AccessRequestRecord;
  } catch {
    return null;
  }
}
