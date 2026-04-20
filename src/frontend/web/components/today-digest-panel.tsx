"use client";

import { useEffect, useState, useTransition } from "react";

type TodayEvent = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
};

type TodayChore = {
  id: string;
  title: string;
  assignedMemberName: string | null;
};

type TodayNote = {
  id: string;
  title: string;
  body: string | null;
  authorDisplayName: string;
};

type TodayResponse = {
  todayEvents: TodayEvent[];
  todayChores: TodayChore[];
  pinnedNotes: TodayNote[];
  pendingReminderCount: number;
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TodayDigestPanel() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function load() {
    const res = await fetch("/api/app/today", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setLoaded(true);
        return;
      }
      throw new Error(`Failed to load today digest: ${res.status}`);
    }

    const d = (await res.json()) as TodayResponse;
    setData(d);
    setLoaded(true);
  }

  useEffect(() => {
    startTransition(() => {
      load().catch(() => setLoaded(true));
    });
  }, []);

  if (!loaded || !data) return null;

  const hasContent =
    data.todayEvents.length > 0 ||
    data.todayChores.length > 0 ||
    data.pinnedNotes.length > 0 ||
    data.pendingReminderCount > 0;

  if (!hasContent) return null;

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Today</div>
        <h2>Digest</h2>

        {data.pendingReminderCount > 0 ? (
          <p className="muted mb-2">
            {data.pendingReminderCount} pending reminder{data.pendingReminderCount !== 1 ? "s" : ""} today
          </p>
        ) : null}

        {data.todayEvents.length > 0 ? (
          <>
            <div className="eyebrow mt-3">Events</div>
            <div className="stack-list">
              {data.todayEvents.map((e, i) => (
                <div className="stack-card" key={i}>
                  <strong>{e.title}</strong>
                  {!e.isAllDay && e.startsAtUtc ? (
                    <div className="muted">{formatTime(e.startsAtUtc)}{e.endsAtUtc ? ` – ${formatTime(e.endsAtUtc)}` : ""}</div>
                  ) : (
                    <div className="muted">All day</div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {data.todayChores.length > 0 ? (
          <>
            <div className="eyebrow mt-3">Chores</div>
            <div className="stack-list">
              {data.todayChores.map((c) => (
                <div className="stack-card" key={c.id}>
                  <strong>{c.title}</strong>
                  {c.assignedMemberName ? (
                    <div className="muted">{c.assignedMemberName}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {data.pinnedNotes.length > 0 ? (
          <>
            <div className="eyebrow mt-3">Pinned notes</div>
            <div className="stack-list">
              {data.pinnedNotes.map((n) => (
                <div className="stack-card" key={n.id}>
                  <strong>{n.title}</strong>
                  {n.body ? <div className="muted">{n.body}</div> : null}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </article>
    </section>
  );
}
