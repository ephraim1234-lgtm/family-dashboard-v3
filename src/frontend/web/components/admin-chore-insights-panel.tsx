"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge, Card, ListCard, SectionHeader } from "@/components/ui";
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
    <Card className="space-y-4 ui-card-admin">
      <SectionHeader
        eyebrow="Admin"
        title="Chore completion insights"
        description="Useful household activity context without drifting into analytics-heavy widgets."
      />
      {error ? <p className="error-text">{error}</p> : null}

      {insights ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="admin">{insights.totalCompletionsThisWeek} this week</Badge>
            <Badge variant="admin">{insights.totalCompletionsThisMonth} this month</Badge>
          </div>

          {insights.chores.length > 0 ? (
            <div className="grid gap-3">
              {insights.chores.map((c) => (
                <ListCard
                  key={c.choreId}
                  title={c.title}
                  description={`${c.completionsThisWeek} this week - ${c.completionsThisMonth} this month`}
                  meta={c.lastCompletedByDisplayName ? `Last: ${c.lastCompletedByDisplayName}` : "No recent completion"}
                  tone="admin"
                />
              ))}
            </div>
          ) : (
            <p className="muted">No active chores.</p>
          )}
        </>
      ) : (
        <p className="muted">Loading...</p>
      )}
    </Card>
  );
}
