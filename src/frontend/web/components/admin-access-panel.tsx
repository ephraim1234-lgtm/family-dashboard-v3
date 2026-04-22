"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ActionButton,
  Badge,
  Card,
  ListCard,
  QuickActions,
  SectionHeader
} from "@/components/ui";

type SessionState = {
  isAuthenticated: boolean;
  user: {
    userId: string;
    email: string;
    displayName: string;
  } | null;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
  hasActiveHousehold: boolean;
  needsOnboarding: boolean;
};

type AdminOverviewState = {
  activeModuleAreas: string[];
  notes: string[];
} | null;

const anonymousSession: SessionState = {
  isAuthenticated: false,
  user: null,
  activeHouseholdId: null,
  activeHouseholdRole: null,
  hasActiveHousehold: false,
  needsOnboarding: false
};

export function AdminAccessPanel() {
  const [session, setSession] = useState<SessionState>(anonymousSession);
  const [adminOverview, setAdminOverview] = useState<AdminOverviewState>(null);
  const [adminStatus, setAdminStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setError(null);

    const sessionResponse = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store"
    });

    const sessionData = (await sessionResponse.json()) as SessionState;
    setSession(sessionData);

    const isOwnerSession =
      sessionData.isAuthenticated
      && sessionData.hasActiveHousehold
      && sessionData.activeHouseholdRole === "Owner";

    if (!isOwnerSession) {
      setAdminStatus(sessionData.isAuthenticated ? 403 : 401);
      setAdminOverview(null);
      return;
    }

    const adminResponse = await fetch("/api/admin/overview", {
      credentials: "same-origin",
      cache: "no-store"
    });

    setAdminStatus(adminResponse.status);

    if (adminResponse.status === 200) {
      setAdminOverview((await adminResponse.json()) as AdminOverviewState);
      return;
    }

    setAdminOverview(null);

    if (adminResponse.status === 401 || adminResponse.status === 403) {
      return;
    }

    setError(`Admin overview failed with ${adminResponse.status}.`);
  }

  useEffect(() => {
    startTransition(() => {
      refresh().catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load admin access state."
        );
      });
    });
  }, []);

  async function logout() {
    setError(null);

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      setError(`Logout failed with ${response.status}.`);
      return;
    }

    await refresh();
  }

  const accessLabel =
    adminStatus === 200
      ? "Owner authorized"
      : adminStatus === 403
        ? "Authenticated but not authorized"
        : "Authentication required";

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
      <Card className="space-y-4 ui-card-admin">
        <SectionHeader
          eyebrow="Admin access"
          title="Owner-gated overview"
          description="The admin shell uses the same persisted session model as the app shell. It does not introduce a separate admin authentication path."
        />
        <div className="flex flex-wrap gap-2">
          <Badge variant="admin">{session.isAuthenticated ? "Authenticated" : "Anonymous"}</Badge>
          <Badge variant={adminStatus === 200 ? "admin" : adminStatus === 403 ? "warning" : "default"}>
            {accessLabel}
          </Badge>
        </div>
        <QuickActions label="Session actions">
          <ActionButton variant="secondary" onClick={() => logout()} disabled={isPending}>
            Log out
          </ActionButton>
          <ActionButton variant="ghost" onClick={() => refresh()} disabled={isPending}>
            Refresh admin state
          </ActionButton>
        </QuickActions>
        {error ? <p className="error-text">{error}</p> : null}
      </Card>

      <Card className="space-y-4 ui-card-admin">
        <SectionHeader eyebrow="Session" title="Current context" titleAs="h3" />
        <div className="grid gap-3">
          <ListCard title="User" description={session.user?.displayName ?? "None"} />
          <ListCard title="Email" description={session.user?.email ?? "None"} />
          <ListCard title="Household" description={session.activeHouseholdId ?? "None"} />
          <ListCard title="Role" description={session.activeHouseholdRole ?? "None"} />
        </div>
      </Card>

      <Card className="space-y-4 ui-card-admin">
        <SectionHeader eyebrow="Overview" title="Admin overview" titleAs="h3" />
        {adminStatus === 200 && adminOverview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {adminOverview.activeModuleAreas.map((area) => (
                <Badge key={area} variant="admin">
                  {area}
                </Badge>
              ))}
            </div>
            <div className="grid gap-3">
              {adminOverview.notes.map((note) => (
                <ListCard key={note} title={note} description="Admin overview note" />
              ))}
            </div>
          </div>
        ) : adminStatus === 403 ? (
          <p className="muted">
            The session is authenticated, but the active household role is not allowed to access the admin overview.
          </p>
        ) : (
          <p className="muted">
            The admin overview only loads for an authenticated owner session with an active household.
          </p>
        )}
      </Card>
    </section>
  );
}
