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
  isReadOnly: boolean;
  canDismiss: boolean;
  canSnooze: boolean;
  canDelete: boolean;
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

function formatReminderState(reminder: ReminderItem, nowMs: number): string {
  const dueMs = new Date(reminder.dueAtUtc).getTime();
  const deltaMinutes = Math.round((dueMs - nowMs) / 60_000);

  if (reminder.status === "Fired") {
    return "Fired";
  }

  if (reminder.status === "Dismissed") {
    return "Dismissed";
  }

  if (deltaMinutes < 0) {
    const overdueMinutes = Math.abs(deltaMinutes);
    if (overdueMinutes < 60) return `Overdue by ${overdueMinutes} min`;
    if (overdueMinutes % 60 === 0) return `Overdue by ${overdueMinutes / 60} hr`;
    return `Overdue by ${overdueMinutes} min`;
  }

  if (deltaMinutes < 60) return `Due in ${deltaMinutes} min`;
  if (deltaMinutes % 60 === 0) return `Due in ${deltaMinutes / 60} hr`;
  return `Due in ${deltaMinutes} min`;
}

export function AdminRemindersPanel() {
  const { isOwner, isLoading: isSessionLoading } = useAdminOwnerSession();
  const [pending, setPending] = useState<ReminderItem[]>([]);
  const [fired, setFired] = useState<ReminderItem[]>([]);
  const [dismissed, setDismissed] = useState<ReminderItem[]>([]);
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
    setDismissed(
      data.items
        .filter((r) => r.status === "Dismissed")
        .sort((a, b) => new Date(b.dueAtUtc).getTime() - new Date(a.dueAtUtc).getTime())
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

  function handleDismiss(reminderId: string) {
    startTransition(() => {
      dismissReminder(reminderId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to dismiss reminder.");
      });
    });
  }

  async function dismissReminder(reminderId: string) {
    setError(null);
    const response = await fetch(`/api/notifications/reminders/${reminderId}/dismiss`, {
      method: "POST",
      credentials: "same-origin"
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Dismiss failed with ${response.status}.`);
    }
    await refresh();
  }

  function handleSnooze(reminderId: string, snoozeMinutes: number) {
    startTransition(() => {
      snoozeReminder(reminderId, snoozeMinutes).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to snooze reminder.");
      });
    });
  }

  async function snoozeReminder(reminderId: string, snoozeMinutes: number) {
    setError(null);
    const response = await fetch(`/api/notifications/reminders/${reminderId}/snooze`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snoozeMinutes })
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Snooze failed with ${response.status}.`);
    }
    await refresh();
  }

  if (!isOwner && !isSessionLoading) {
    return null;
  }

  const nowMs = Date.now();
  const overdue = pending.filter((r) => new Date(r.dueAtUtc).getTime() < nowMs);
  const upcoming = pending.filter((r) => new Date(r.dueAtUtc).getTime() >= nowMs);

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Reminders</div>
          <h2>Reminder triage</h2>
          <p className="muted">
            Pending reminders stay split into overdue and upcoming review states.
            The worker checks every 60 s and marks them fired once their due time passes.
          </p>
          <div className="summary-grid mt-16">
            <div className="stack-card">
              <div className="eyebrow">Pending</div>
              <div className="summary-stat">{pending.length}</div>
              <div className="muted">Needs review before it fires</div>
            </div>
            <div className="stack-card reminder-overdue-summary-card">
              <div className="eyebrow">Overdue</div>
              <div className="summary-stat">{overdue.length}</div>
              <div className="muted">Past due but still pending</div>
            </div>
            <div className="stack-card">
              <div className="eyebrow">Recently fired</div>
              <div className="summary-stat">{fired.length}</div>
              <div className="muted">Most recent audit entries</div>
            </div>
            <div className="stack-card">
              <div className="eyebrow">Dismissed</div>
              <div className="summary-stat">{dismissed.length}</div>
              <div className="muted">Reviewed and cleared</div>
            </div>
          </div>
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
          {overdue.length > 0 ? (
            <>
              <div className="eyebrow mt-16">Overdue</div>
              <div className="stack-list">
                {overdue.map((r) => (
                  <div className="stack-card reminder-overdue-card" key={r.id}>
                    <div className="stack-card-header">
                      <div>
                        <strong>{r.eventTitle}</strong>
                        <div className="muted">{formatLeadTime(r.minutesBefore)}</div>
                      </div>
                      <div className="pill-row">
                        <span className="pill reminder-overdue-pill">
                          {formatReminderState(r, nowMs)}
                        </span>
                        <span className="pill">
                          Due {new Date(r.dueAtUtc).toLocaleString()}
                        </span>
                        {r.canSnooze ? (
                          <button
                            className="action-button action-button-ghost"
                            onClick={() => handleSnooze(r.id, 60)}
                            disabled={isPending}
                          >
                            Snooze 1h
                          </button>
                        ) : null}
                        {r.canSnooze ? (
                          <button
                            className="action-button action-button-ghost"
                            onClick={() => handleSnooze(r.id, 1440)}
                            disabled={isPending}
                          >
                            Snooze 1d
                          </button>
                        ) : null}
                        {r.canDismiss ? (
                          <button
                            className="action-button"
                            onClick={() => handleDismiss(r.id)}
                            disabled={isPending}
                          >
                            Dismiss
                          </button>
                        ) : null}
                        {r.canDelete ? (
                          <button
                            className="action-button action-button-secondary"
                            onClick={() => handleDelete(r.id)}
                            disabled={isPending}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {upcoming.length === 0 ? (
            <p className={overdue.length > 0 ? "muted mt-16" : "muted"}>
              No upcoming pending reminders.
            </p>
          ) : (
            <>
              <div className="eyebrow mt-16">Upcoming</div>
              <div className="stack-list">
                {upcoming.map((r) => (
                  <div className="stack-card" key={r.id}>
                    <div className="stack-card-header">
                      <div>
                        <strong>{r.eventTitle}</strong>
                        <div className="muted">{formatLeadTime(r.minutesBefore)}</div>
                      </div>
                      <div className="pill-row">
                        <span className="pill">
                          {formatReminderState(r, nowMs)}
                        </span>
                        <span className="pill">
                          Due {new Date(r.dueAtUtc).toLocaleString()}
                        </span>
                        {r.canSnooze ? (
                          <button
                            className="action-button action-button-ghost"
                            onClick={() => handleSnooze(r.id, 60)}
                            disabled={isPending}
                          >
                            Snooze 1h
                          </button>
                        ) : null}
                        {r.canSnooze ? (
                          <button
                            className="action-button action-button-ghost"
                            onClick={() => handleSnooze(r.id, 1440)}
                            disabled={isPending}
                          >
                            Snooze 1d
                          </button>
                        ) : null}
                        {r.canDismiss ? (
                          <button
                            className="action-button"
                            onClick={() => handleDismiss(r.id)}
                            disabled={isPending}
                          >
                            Dismiss
                          </button>
                        ) : null}
                        {r.canDelete ? (
                          <button
                            className="action-button action-button-secondary"
                            onClick={() => handleDelete(r.id)}
                            disabled={isPending}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
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

        <article className="panel">
          <div className="eyebrow">Reminders</div>
          <h2>Recently dismissed</h2>
          <p className="muted">
            The 20 most recently dismissed reminders. This keeps reviewed reminders
            separate from fired audit history.
          </p>
          {dismissed.length === 0 ? (
            <p className="muted">No dismissed reminders yet.</p>
          ) : (
            <div className="stack-list">
              {dismissed.map((r) => (
                <div className="stack-card" key={r.id}>
                  <div className="stack-card-header">
                    <div>
                      <strong>{r.eventTitle}</strong>
                      <div className="muted">{formatLeadTime(r.minutesBefore)}</div>
                    </div>
                    <div className="pill-row">
                      <span className="pill">Dismissed</span>
                      <span className="pill">
                        Due {new Date(r.dueAtUtc).toLocaleString()}
                      </span>
                      {r.canDelete ? (
                        <button
                          className="action-button action-button-secondary"
                          onClick={() => handleDelete(r.id)}
                          disabled={isPending}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
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
