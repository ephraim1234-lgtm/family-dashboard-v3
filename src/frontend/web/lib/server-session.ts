import { cookies } from "next/headers";
import { siteConfig } from "./site-config";

export type SessionState = {
  isAuthenticated: boolean;
  user: {
    userId: string;
    email: string;
    displayName: string;
  } | null;
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
  hasActiveHousehold: boolean;
  needsOnboarding: boolean;
};

export type HouseholdInvitePreview = {
  householdName: string;
  email: string;
  role: string;
  expiresAtUtc: string;
  isExpired: boolean;
};

export const anonymousServerSession: SessionState = {
  isAuthenticated: false,
  user: null,
  userId: null,
  email: null,
  displayName: null,
  activeHouseholdId: null,
  activeHouseholdRole: null,
  hasActiveHousehold: false,
  needsOnboarding: false
};

function buildCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function fetchServerJson<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = buildCookieHeader(cookieStore);
  const response = await fetch(`${siteConfig.internalApiBaseUrl}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function getServerSession() {
  return (await fetchServerJson<SessionState>("/api/identity/session")) ?? anonymousServerSession;
}

export async function getHouseholdInvitePreview(token: string) {
  return fetchServerJson<HouseholdInvitePreview>(
    `/api/household-invites/${encodeURIComponent(token)}/preview`
  );
}

export function normalizeNextPath(nextPath?: string | string[] | null) {
  const value = Array.isArray(nextPath) ? nextPath[0] : nextPath;
  return value && value.startsWith("/") ? value : null;
}
