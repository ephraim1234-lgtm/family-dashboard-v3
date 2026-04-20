"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge, Button, Card } from "@/components/ui";

type SessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
};

type HouseholdState = {
  householdId: string;
  householdName: string;
  activeRole: string;
  membershipStatus: string;
} | null;

const anonymousSession: SessionState = {
  isAuthenticated: false,
  userId: null,
  activeHouseholdId: null,
  activeHouseholdRole: null
};

export function AuthStatusPanel() {
  const [session, setSession] = useState<SessionState>(anonymousSession);
  const [household, setHousehold] = useState<HouseholdState>(null);
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

    if (!sessionData.isAuthenticated) {
      setHousehold(null);
      return;
    }

    const householdResponse = await fetch("/api/households/current", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!householdResponse.ok) {
      setHousehold(null);
      setError(`Household lookup failed with ${householdResponse.status}.`);
      return;
    }

    setHousehold((await householdResponse.json()) as HouseholdState);
  }

  useEffect(() => {
    startTransition(() => {
      refresh().catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load auth status."
        );
      });
    });
  }, []);

  async function runAction(action: "login" | "logout") {
    setError(null);

    const response = await fetch(
      action === "login" ? "/api/auth/dev-login" : "/api/auth/logout",
      {
        method: "POST",
        credentials: "same-origin"
      }
    );

    if (!response.ok) {
      setError(`${action} failed with ${response.status}.`);
      return;
    }

    await refresh();

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
      <Card className="space-y-4">
        <div className="eyebrow">Auth Status</div>
        <h2 className="text-2xl font-semibold tracking-tight">Development session</h2>
        <p className="muted">
          This shell talks to the backend through narrow Next-side proxy routes
          so Dockerized local auth can stay same-origin.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge>
            {session.isAuthenticated ? "Authenticated" : "Anonymous"}
          </Badge>
          <Badge>
            Role: {session.activeHouseholdRole ?? "None"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => runAction("login")} disabled={isPending}>
            Dev Login
          </Button>
          <Button variant="secondary" onClick={() => runAction("logout")} disabled={isPending}>
            Log Out
          </Button>
          <Button variant="ghost" onClick={() => refresh()} disabled={isPending}>
            Refresh Status
          </Button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold tracking-tight">Current session</h2>
        <dl className="data-list">
          <div>
            <dt>User</dt>
            <dd>{session.userId ?? "None"}</dd>
          </div>
          <div>
            <dt>Household</dt>
            <dd>{session.activeHouseholdId ?? "None"}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{session.activeHouseholdRole ?? "None"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold tracking-tight">Current household</h2>
        <dl className="data-list">
          <div>
            <dt>Name</dt>
            <dd>{household?.householdName ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Membership</dt>
            <dd>{household?.membershipStatus ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Active role</dt>
            <dd>{household?.activeRole ?? "Unavailable"}</dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
