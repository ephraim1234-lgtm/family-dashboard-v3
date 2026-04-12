"use client";

import { useEffect, useState, useTransition } from "react";

type UpcomingEventItem = {
  id: string;
  title: string;
  description: string | null;
  isAllDay: boolean;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
};

type UpcomingEventsResponse = {
  windowStartUtc: string;
  windowEndUtc: string;
  items: UpcomingEventItem[];
};

function formatEventTime(item: UpcomingEventItem): string {
  if (item.isAllDay) return "All day";
  if (!item.startsAtUtc) return "—";
  const d = new Date(item.startsAtUtc);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatEventDate(startsAtUtc: string | null): string {
  if (!startsAtUtc) return "—";
  const d = new Date(startsAtUtc);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

type DayGroup = {
  date: string;
  label: string;
  items: UpcomingEventItem[];
};

function groupByDay(items: UpcomingEventItem[]): DayGroup[] {
  const map = new Map<string, UpcomingEventItem[]>();

  for (const item of items) {
    const key = item.startsAtUtc
      ? new Date(item.startsAtUtc).toDateString()
      : "unknown";
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }

  return Array.from(map.entries()).map(([date, dayItems]) => ({
    date,
    label: formatEventDate(dayItems[0]?.startsAtUtc ?? null),
    items: dayItems
  }));
}

export function UpcomingAgendaPanel() {
  const [response, setResponse] = useState<UpcomingEventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load agenda.");
      });
    });
  }, []);

  async function load() {
    const res = await fetch("/api/scheduling/agenda", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return;
      throw new Error(`Agenda fetch failed with ${res.status}.`);
    }

    setResponse((await res.json()) as UpcomingEventsResponse);
  }

  const dayGroups = response ? groupByDay(response.items) : [];

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Schedule</div>
        <h2>Upcoming — next 14 days</h2>
        <div className="action-row">
          <button
            className="action-button action-button-ghost"
            onClick={() =>
              startTransition(() => {
                load().catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Unable to refresh.");
                });
              })
            }
            disabled={isPending}
          >
            Refresh
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {!response && !error && !isPending ? null : null}
        {response && dayGroups.length === 0 ? (
          <p className="muted" style={{ marginTop: "12px" }}>
            Nothing scheduled in the next 14 days.
          </p>
        ) : (
          <div className="day-group-list" style={{ marginTop: "16px" }}>
            {dayGroups.map((group) => (
              <div className="day-group" key={group.date}>
                <div className="day-group-heading">{group.label}</div>
                <div className="stack-list">
                  {group.items.map((item) => (
                    <div className="stack-card" key={`${item.id}-${item.startsAtUtc}`}>
                      <div className="stack-card-header">
                        <div>
                          <strong>{item.title}</strong>
                          {item.description ? (
                            <div className="muted">{item.description}</div>
                          ) : null}
                        </div>
                        <span className="pill">{formatEventTime(item)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
