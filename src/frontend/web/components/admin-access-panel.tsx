"use client";

import { useEffect, useState, useTransition } from "react";

type SessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
};

type AdminOverviewState = {
  activeModuleAreas: string[];
  notes: string[];
} | null;

const anonymousSession: SessionState = {
  isAuthenticated: false,
  userId: null,
  activeHouseholdId: null,
  activeHouseholdRole: null
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
      && sessionData.activeHouseholdId != null
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

    if (adminResponse.status === 401) {
      return;
    }

    if (adminResponse.status === 403) {
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

  const accessLabel =
    adminStatus === 200
      ? "Owner authorized"
      : adminStatus === 403
        ? "Authenticated but not authorized"
        : "Authentication required";

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Admin Access</div>
        <h2>Owner-gated overview</h2>
        <p className="muted">
          The admin shell uses the same persisted session model as the app
          shell. It does not introduce a separate admin authentication path.
        </p>
        <div className="pill-row">
          <span className="pill">
            {session.isAuthenticated ? "Authenticated" : "Anonymous"}
          </span>
          <span className="pill">{accessLabel}</span>
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
            Refresh Admin State
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </article>

      <article className="panel">
        <h2>Session context</h2>
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
        <h2>Admin overview</h2>
        {adminStatus === 200 && adminOverview ? (
          <>
            <div className="pill-row">
              {adminOverview.activeModuleAreas.map((area) => (
                <span className="pill" key={area}>
                  {area}
                </span>
              ))}
            </div>
            <div className="section-spacer" />
            <ul className="plain-list">
              {adminOverview.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        ) : adminStatus === 403 ? (
          <p className="muted">
            The session is authenticated, but the active household role is not
            allowed to access the admin overview.
          </p>
        ) : (
          <p className="muted">
            Sign in with an owner-scoped development session to load the admin
            overview.
          </p>
        )}
      </article>
    </section>
  );
}

