"use client";

import { useEffect, useState, useTransition } from "react";
import { StatCard, Card, SectionHeader } from "@/components/ui";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type AdminStats = {
  memberCount: number;
  activeChoreCount: number;
  eventsThisWeekCount: number;
  choreCompletionsThisWeekCount: number;
  noteCount: number;
};

export function AdminStatsPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    const res = await fetch("/api/admin/stats", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return;
      throw new Error(`Stats request failed with ${res.status}.`);
    }

    setStats((await res.json()) as AdminStats);
  }

  useEffect(() => {
    if (!isOwner) return;
    startTransition(() => {
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load stats.");
      });
    });
  }, [isOwner]);

  if (isSessionLoading || !isOwner) return null;

  return (
    <Card className="space-y-5 ui-card-admin">
      <SectionHeader
        eyebrow="Admin"
        title="Household stats"
        description="A quick snapshot of the current household load without turning the page into an analytics dashboard."
      />
      {error ? <p className="error-text">{error}</p> : null}

      {stats ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Members" value={stats.memberCount} tone="accent" />
          <StatCard label="Active chores" value={stats.activeChoreCount} />
          <StatCard label="Events this week" value={stats.eventsThisWeekCount} />
          <StatCard label="Completions this week" value={stats.choreCompletionsThisWeekCount} />
          <StatCard label="Notes" value={stats.noteCount} />
        </div>
      ) : (
        <p className="muted">Loading...</p>
      )}
    </Card>
  );
}
