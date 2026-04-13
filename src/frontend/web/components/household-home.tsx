"use client";

import { useEffect, useState, useTransition } from "react";

type HomeEvent = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
};

type HomeChore = {
  id: string;
  title: string;
  assignedMemberName: string | null;
  completedToday: boolean;
};

type HomeNote = {
  id: string;
  title: string;
  body: string | null;
  authorDisplayName: string;
};

type HomeActivityItem = {
  kind: "ChoreCompletion" | "NoteCreated";
  title: string;
  detail: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
};

type HomeResponse = {
  todayEvents: HomeEvent[];
  todayChores: HomeChore[];
  pinnedNotes: HomeNote[];
  recentActivity: HomeActivityItem[];
  upcomingEventCount: number;
  pendingReminderCount: number;
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(utc: string): string {
  const diffMs = Date.now() - new Date(utc).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function HouseholdHome() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  async function load() {
    const res = await fetch("/api/app/home", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setLoaded(true);
        return;
      }
      throw new Error(`Failed to load home: ${res.status}`);
    }

    const d = (await res.json()) as HomeResponse;
    setData(d);
    setCompletedIds(new Set());
    setLoaded(true);
  }

  useEffect(() => {
    startTransition(() => {
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load home.");
        setLoaded(true);
      });
    });
  }, []);

  async function completeChore(choreId: string) {
    const res = await fetch(`/api/chores/${choreId}/complete`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: null }),
    });

    if (!res.ok) {
      throw new Error(`Complete failed with ${res.status}.`);
    }

    setCompletedIds((prev) => new Set([...prev, choreId]));
  }

  function handleComplete(choreId: string) {
    startTransition(() => {
      completeChore(choreId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to complete chore.");
      });
    });
  }

  if (!loaded) return null;

  if (!data) {
    return (
      <section className="grid">
        <article className="panel">
          <p className="muted">Sign in to see your household home.</p>
        </article>
      </section>
    );
  }

  const incompleteChores = data.todayChores.filter(
    (c) => !c.completedToday && !completedIds.has(c.id)
  );
  const doneChores = data.todayChores.filter(
    (c) => c.completedToday || completedIds.has(c.id)
  );

  const hasTodayContent =
    data.todayEvents.length > 0 ||
    data.todayChores.length > 0 ||
    data.pendingReminderCount > 0;

  return (
    <>
      {error ? (
        <section className="grid">
          <article className="panel">
            <p className="error-text">{error}</p>
          </article>
        </section>
      ) : null}

      {/* ── Today ── */}
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Today</div>
          <h2>What matters now</h2>

          {!hasTodayContent ? (
            <p className="muted" style={{ marginTop: "8px" }}>
              Nothing scheduled for today. Enjoy the calm.
            </p>
          ) : null}

          {data.pendingReminderCount > 0 ? (
            <p className="muted" style={{ marginTop: "8px" }}>
              {data.pendingReminderCount} pending reminder
              {data.pendingReminderCount !== 1 ? "s" : ""}
            </p>
          ) : null}

          {data.todayEvents.length > 0 ? (
            <>
              <div className="eyebrow" style={{ marginTop: "16px" }}>
                Events
              </div>
              <div className="stack-list" style={{ marginTop: "8px" }}>
                {data.todayEvents.map((e, i) => (
                  <div className="stack-card" key={i}>
                    <strong>{e.title}</strong>
                    {!e.isAllDay && e.startsAtUtc ? (
                      <div className="muted">
                        {formatTime(e.startsAtUtc)}
                        {e.endsAtUtc ? ` – ${formatTime(e.endsAtUtc)}` : ""}
                      </div>
                    ) : (
                      <div className="muted">All day</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {incompleteChores.length > 0 ? (
            <>
              <div
                className="eyebrow home-attention-label"
                style={{ marginTop: "16px" }}
              >
                Chores — needs attention
              </div>
              <div className="stack-list" style={{ marginTop: "8px" }}>
                {incompleteChores.map((c) => (
                  <div className="stack-card home-attention-card" key={c.id}>
                    <div className="stack-card-header">
                      <div>
                        <strong>{c.title}</strong>
                        {c.assignedMemberName ? (
                          <div className="muted" style={{ fontSize: "0.82rem" }}>
                            {c.assignedMemberName}
                          </div>
                        ) : null}
                      </div>
                      <button
                        className="action-button"
                        onClick={() => handleComplete(c.id)}
                        disabled={isPending}
                        style={{ fontSize: "0.85rem", padding: "8px 14px" }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {doneChores.length > 0 ? (
            <>
              <div className="eyebrow" style={{ marginTop: "16px" }}>
                Chores — completed
              </div>
              <div className="stack-list" style={{ marginTop: "8px" }}>
                {doneChores.map((c) => (
                  <div
                    className="stack-card"
                    key={c.id}
                    style={{ opacity: 0.6 }}
                  >
                    <div className="stack-card-header">
                      <div>
                        <strong>{c.title}</strong>
                        {c.assignedMemberName ? (
                          <div
                            className="muted"
                            style={{ fontSize: "0.82rem" }}
                          >
                            {c.assignedMemberName}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className="pill"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </article>
      </section>

      {/* ── Pinned notes ── */}
      {data.pinnedNotes.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Pinboard</div>
              <h2>Pinned notes</h2>
              <div className="stack-list" style={{ marginTop: "12px" }}>
                {data.pinnedNotes.map((n) => (
                  <div className="stack-card" key={n.id}>
                    <strong>{n.title}</strong>
                    {n.body ? <div className="muted">{n.body}</div> : null}
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      {n.authorDisplayName}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {/* ── Recent activity ── */}
      {data.recentActivity.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Household</div>
              <h2>What changed recently</h2>
              <div className="stack-list" style={{ marginTop: "12px" }}>
                {data.recentActivity.map((item, i) => (
                  <div
                    className="stack-card"
                    key={`${item.kind}-${item.occurredAtUtc}-${i}`}
                  >
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{item.title}</strong>
                        {item.detail ? (
                          <div className="muted">{item.detail}</div>
                        ) : null}
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {item.kind === "ChoreCompletion"
                            ? "Completed"
                            : "Note added"}{" "}
                          by {item.actorDisplayName}
                        </div>
                      </div>
                      <span
                        className="pill"
                        style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                      >
                        {formatRelativeTime(item.occurredAtUtc)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {/* ── Coming up ── */}
      {data.upcomingEventCount > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Schedule</div>
              <h2>Coming up</h2>
              <p className="muted" style={{ marginTop: "8px" }}>
                {data.upcomingEventCount} event
                {data.upcomingEventCount !== 1 ? "s" : ""} in the next 7 days
              </p>
            </article>
          </section>
        </>
      ) : null}
    </>
  );
}
