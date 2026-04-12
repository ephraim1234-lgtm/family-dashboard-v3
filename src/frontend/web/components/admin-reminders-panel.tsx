"use client";

import { useEffect, useState, useTransition } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type ReminderItem = {
  id: string;
  scheduledEventId: string;
  eventTitle: string;
  minutesBefore: number;
  dueAtUtc: string;
  status: string;
  firedAtUtc: string | null;
  createdAtUtc: string;
};

type ReminderListResponse = {
  items: ReminderItem[];
};

function formatLeadTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min before`;
  if (minutes === 60) return "1 hr before";
  if (minutes % 60 === 0) return `${minutes / 60} hr before`;
  return `${minutes} min before`;
}

export function AdminRemindersPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [pending, setPending] = useState<ReminderItem[]>([]);
  const [fired, setFired] = useState<ReminderItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setError(null);

    const response = await fetch("/api/notifications/reminders", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return;
      throw new Error(`Reminder lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as ReminderListResponse;
    setPending(
      data.items
        .filter((r) => r.status === "Pending")
        .sort((a, b) => new Date(a.dueAtUtc).getTime() - new Date(b.dueAtUtc).getTime())
    );
    setFired(
      data.items
        .filter((r) => r.status === "Fired")
        .sort((a, b) => new Date(b.firedAtUtc ?? b.dueAtUtc).getTime() - new Date(a.firedAtUtc ?? a.dueAtUtc).getTime())
        .slice(0, 20)
    );
  }

  useEffect(() => {
    if (isSessionLoading || !isOwner) return;

    startTransition(() => {
      refresh().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load reminders.");
      });
    });
  }, [isOwner, isSessionLoading]);

  function handleDelete(reminderId: string) {
    startTransition(() => {
      deleteReminder(reminderId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to delete reminder.");
      });
    });
  }

  async function deleteReminder(reminderId: string) {
    setError(null);
    const response = await fetch(`/api/notifications/reminders/${reminderId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Delete failed with ${response.status}.`);
    }
    await refresh();
  }

  if (!isOwner && !isSessionLoading) {
    return null;
  }

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Reminders</div>
          <h2>Pending reminders</h2>
          <p className="muted">
            Reminders waiting to fire. The worker checks every 60 s and marks
            them fired once their due time passes.
          </p>
          <div className="action-row">
            <button
              className="action-button action-button-ghost"
              onClick={() =>
                startTransition(() => {
                  refresh().catch((err: unknown) => {
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
          {pending.length === 0 ? (
            <p className="muted">No pending reminders.</p>
          ) : (
            <div className="stack-list">
              {pending.map((r) => (
                <div className="stack-card" key={r.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{r.eventTitle}</strong>
                      <div className="muted">{formatLeadTime(r.minutesBefore)}</div>
                    </div>
                    <div className="pill-row">
                      <span className="pill">
                        Due {new Date(r.dueAtUtc).toLocaleString()}
                      </span>
                      <button
                        className="action-button action-button-secondary"
                        onClick={() => handleDelete(r.id)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="eyebrow">Reminders</div>
          <h2>Recently fired</h2>
          <p className="muted">
            The 20 most recently fired reminders. Read-only — fired reminders
            are kept for audit.
          </p>
          {fired.length === 0 ? (
            <p className="muted">No fired reminders yet.</p>
          ) : (
            <div className="stack-list">
              {fired.map((r) => (
                <div className="stack-card" key={r.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{r.eventTitle}</strong>
                      <div className="muted">{formatLeadTime(r.minutesBefore)}</div>
                    </div>
                    <span className="pill">
                      Fired {r.firedAtUtc ? new Date(r.firedAtUtc).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
