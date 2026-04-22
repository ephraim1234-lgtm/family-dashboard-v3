"use client";

import { useEffect, useState, useTransition } from "react";
import { DisplaySurfacePanel } from "./display-surface-panel";

type DisplayAgendaItem = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  description: string | null;
};

type DisplayAgendaSection = {
  windowStartUtc: string;
  windowEndUtc: string;
  items: DisplayAgendaItem[];
};

type DisplaySnapshot = {
  accessMode: string;
  deviceName: string;
  householdName: string;
  accessTokenHint: string;
  generatedAtUtc: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  agendaSection: DisplayAgendaSection;
};

type DisplayAccessPanelProps = {
  token: string;
};

type SessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  activeHouseholdId: string | null;
  activeHouseholdRole: string | null;
};

const anonymousSession: SessionState = {
  isAuthenticated: false,
  userId: null,
  activeHouseholdId: null,
  activeHouseholdRole: null
};

function formatEventTime(item: DisplayAgendaItem): string {
  if (item.isAllDay) {
    return "All day";
  }
  if (!item.startsAtUtc) {
    return "—";
  }
  const d = new Date(item.startsAtUtc);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function LegacyDisplayAccessPanel({ token }: DisplayAccessPanelProps) {
  const [session, setSession] = useState<SessionState>(anonymousSession);
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setError(null);

    try {
      const [sessionResponse, snapshotResponse] = await Promise.all([
        fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store"
        }),
        fetch(`/api/display/projection/${token}`, {
          method: "GET",
          cache: "no-store"
        })
      ]);

      const nextSession = (await sessionResponse.json()) as SessionState;
      setSession(nextSession);

      if (!snapshotResponse.ok) {
        throw new Error("Display snapshot request failed.");
      }

      const nextSnapshot = (await snapshotResponse.json()) as DisplaySnapshot;
      setSnapshot(nextSnapshot);
    } catch {
      setError("Unable to load the display access check right now.");
      setSnapshot(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });

    await refresh();
  }

  useEffect(() => {
    startTransition(() => {
      refresh().catch(() => {
        setError("Unable to load the display access check right now.");
      });
    });
  }, [token]);

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Display Access</div>
        <h2>Persisted display projection</h2>
        <p>
          This route loads a persisted display projection through a proxy path
          that intentionally ignores normal app/admin session cookies.
        </p>

        <div className="action-row">
          <button
            className="action-button action-button-secondary"
            type="button"
            onClick={logout}
            disabled={isPending}
          >
            Log Out
          </button>
          <button
            className="action-button action-button-ghost"
            type="button"
            onClick={() => void refresh()}
            disabled={isPending}
          >
            Refresh Display State
          </button>
        </div>

        {isPending ? <p className="muted">Loading display projection...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {snapshot ? (
          <dl className="data-list">
            <div>
              <dt>Access mode</dt>
              <dd>{snapshot.accessMode}</dd>
            </div>
            <div>
              <dt>Device</dt>
              <dd>{snapshot.deviceName}</dd>
            </div>
            <div>
              <dt>Token hint</dt>
              <dd>{snapshot.accessTokenHint}</dd>
            </div>
            <div>
              <dt>Household</dt>
              <dd>{snapshot.householdName}</dd>
            </div>
          </dl>
        ) : null}
      </article>

      <article className="panel">
        <h2>Current app session</h2>
        <p>
          The normal user session can exist at the same time, but it does not
          authorize or shape the display snapshot.
        </p>

        <dl className="data-list">
          <div>
            <dt>Authenticated</dt>
            <dd>{session.isAuthenticated ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>User</dt>
            <dd>{session.userId ?? "None"}</dd>
          </div>
          <div>
            <dt>Household role</dt>
            <dd>{session.activeHouseholdRole ?? "None"}</dd>
          </div>
        </dl>

        {snapshot ? (
          <>
            <h2>Upcoming agenda</h2>
            <p className="muted mb-2">
              {new Date(snapshot.agendaSection.windowStartUtc).toLocaleDateString()} –{" "}
              {new Date(snapshot.agendaSection.windowEndUtc).toLocaleDateString()}
            </p>
            {snapshot.agendaSection.items.length === 0 ? (
              <p className="muted">No events scheduled in this window.</p>
            ) : (
              <ul className="plain-list">
                {snapshot.agendaSection.items.map((item) => (
                  <li key={item.title + (item.startsAtUtc ?? "")}>
                    <strong>{formatEventTime(item)}</strong> — {item.title}
                    {item.description ? (
                      <span className="muted"> ({item.description})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </article>
    </section>
  );
}

export function DisplayAccessPanel({ token }: DisplayAccessPanelProps) {
  return <DisplaySurfacePanel token={token} />;
}
