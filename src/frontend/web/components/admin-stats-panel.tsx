"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

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
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Admin</div>
        <h2>Household stats</h2>
        {error ? <p className="error-text">{error}</p> : null}

        {stats ? (
          <div className="pill-row mt-3 flex-wrap gap-2">
            <span className="pill">{stats.memberCount} member{stats.memberCount !== 1 ? "s" : ""}</span>
            <span className="pill">{stats.activeChoreCount} active chore{stats.activeChoreCount !== 1 ? "s" : ""}</span>
            <span className="pill">{stats.eventsThisWeekCount} event{stats.eventsThisWeekCount !== 1 ? "s" : ""} this week</span>
            <span className="pill">{stats.choreCompletionsThisWeekCount} completion{stats.choreCompletionsThisWeekCount !== 1 ? "s" : ""} this week</span>
            <span className="pill">{stats.noteCount} note{stats.noteCount !== 1 ? "s" : ""}</span>
          </div>
        ) : (
          <p className="muted">Loading&hellip;</p>
        )}
      </article>
    </section>
  );
}
