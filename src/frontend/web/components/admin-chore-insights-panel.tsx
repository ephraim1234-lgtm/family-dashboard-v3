"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type ChoreInsightItem = {
  choreId: string;
  title: string;
  completionsThisWeek: number;
  completionsThisMonth: number;
  lastCompletedByDisplayName: string | null;
  lastCompletedAtUtc: string | null;
};

type AdminChoreInsights = {
  chores: ChoreInsightItem[];
  totalCompletionsThisWeek: number;
  totalCompletionsThisMonth: number;
};

export function AdminChoreInsightsPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [insights, setInsights] = useState<AdminChoreInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isOwner) return;
    startTransition(() => {
      fetch("/api/admin/chore-insights", { credentials: "same-origin", cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) return;
            throw new Error(`Request failed with ${res.status}.`);
          }
          setInsights((await res.json()) as AdminChoreInsights);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Unable to load chore insights.");
        });
    });
  }, [isOwner]);

  if (isSessionLoading || !isOwner) return null;

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Admin</div>
        <h2>Chore completion insights</h2>
        {error ? <p className="error-text">{error}</p> : null}

        {insights ? (
          <>
            <div className="pill-row" style={{ marginTop: "8px", gap: "8px" }}>
              <span className="pill">{insights.totalCompletionsThisWeek} this week</span>
              <span className="pill">{insights.totalCompletionsThisMonth} this month</span>
            </div>

            {insights.chores.length > 0 ? (
              <div className="stack-list" style={{ marginTop: "12px" }}>
                {insights.chores.map((c) => (
                  <div className="stack-card" key={c.choreId}>
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{c.title}</strong>
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {c.completionsThisWeek} this week &middot; {c.completionsThisMonth} this month
                          {c.lastCompletedByDisplayName
                            ? ` · last: ${c.lastCompletedByDisplayName}`
                            : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: "8px" }}>No active chores.</p>
            )}
          </>
        ) : (
          <p className="muted">Loading&hellip;</p>
        )}
      </article>
    </section>
  );
}
