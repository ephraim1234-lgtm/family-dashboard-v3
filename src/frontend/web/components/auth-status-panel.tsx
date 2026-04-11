"use client";

import { useEffect, useState, useTransition } from "react";

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
  }

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Auth Status</div>
        <h2>Development session</h2>
        <p className="muted">
          This shell talks to the backend through narrow Next-side proxy routes
          so Dockerized local auth can stay same-origin.
        </p>
        <div className="pill-row">
          <span className="pill">
            {session.isAuthenticated ? "Authenticated" : "Anonymous"}
          </span>
          <span className="pill">
            Role: {session.activeHouseholdRole ?? "None"}
          </span>
        </div>
        <div className="action-row">
          <button
            className="action-button"
            onClick={() => runAction("login")}
            disabled={isPending}
          >
            Dev Login
          </button>
          <button
            className="action-button action-button-secondary"
            onClick={() => runAction("logout")}
            disabled={isPending}
          >
            Log Out
          </button>
          <button
            className="action-button action-button-ghost"
            onClick={() => refresh()}
            disabled={isPending}
          >
            Refresh Status
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </article>

      <article className="panel">
        <h2>Current session</h2>
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
      </article>

      <article className="panel">
        <h2>Current household</h2>
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
      </article>
    </section>
  );
}

