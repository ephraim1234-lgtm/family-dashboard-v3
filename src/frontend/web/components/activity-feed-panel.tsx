"use client";

import { useEffect, useState, useTransition } from "react";

type ActivityFeedItem = {
  kind: "ChoreCompletion" | "NoteCreated";
  title: string;
  detail: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
};

type ActivityFeedResponse = {
  items: ActivityFeedItem[];
};

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

export function ActivityFeedPanel() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      fetch("/api/app/activity", { credentials: "same-origin", cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              setLoaded(true);
              return;
            }
            throw new Error(`Failed to load activity: ${res.status}`);
          }
          const data = (await res.json()) as ActivityFeedResponse;
          setItems(data.items ?? []);
          setLoaded(true);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unable to load activity.");
          setLoaded(true);
        });
    });
  }, []);

  if (!loaded) return null;

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Household</div>
        <h2>Recent activity</h2>
        {error ? <p className="error-text">{error}</p> : null}

        {items.length === 0 ? (
          <p className="muted">No recent activity.</p>
        ) : (
          <div className="stack-list mt-3">
            {items.map((item, i) => (
              <div className="stack-card" key={`${item.kind}-${item.occurredAtUtc}-${i}`}>
                <div className="stack-card-header">
                  <div className="flex-1">
                    <strong>{item.title}</strong>
                    {item.detail ? <div className="muted">{item.detail}</div> : null}
                    <div className="muted text-[0.8rem]">
                      {item.kind === "ChoreCompletion" ? "Completed" : "Note added"} by{" "}
                      {item.actorDisplayName}
                    </div>
                  </div>
                  <span className="pill whitespace-nowrap text-[0.75rem]">
                    {formatRelativeTime(item.occurredAtUtc)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
