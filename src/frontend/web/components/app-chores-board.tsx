"use client";

import { useEffect, useState, useTransition } from "react";

type ChoreInstance = {
  id: string;
  choreId: string;
  choreTitle: string;
  assignedToMemberId: string | null;
  assignedToDisplayName: string | null;
  dueDate: string;
  status: string;
  completedAtUtc: string | null;
  completedByDisplayName: string | null;
  createdAtUtc: string;
};

type SessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  activeHouseholdId: string | null;
};

function statusPill(status: string) {
  const classes: Record<string, string> = {
    Pending: "pill pill-pending",
    Completed: "pill pill-done",
    Skipped: "pill pill-skipped"
  };
  return <span className={classes[status] ?? "pill"}>{status}</span>;
}

function formatDueLabel(dueDate: string, todayStr: string, tomorrowStr: string): string {
  if (dueDate === todayStr) return "Today";
  if (dueDate === tomorrowStr) return "Tomorrow";
  return new Date(dueDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function AppChoresBoard() {
  const [session, setSession] = useState<SessionState>({
    isAuthenticated: false,
    userId: null,
    activeHouseholdId: null
  });

  const [instances, setInstances] = useState<ChoreInstance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store"
      });
      if (!sessionRes.ok) return;
      const data = (await sessionRes.json()) as SessionState;
      setSession(data);
      if (data.isAuthenticated && data.activeHouseholdId) {
        await refreshInstances();
      }
    }
    init().catch(() => {});
  }, []);

  async function refreshInstances() {
    const res = await fetch("/api/chores/instances?windowDays=8", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (res.ok) {
      const data = (await res.json()) as { items: ChoreInstance[] };
      setInstances(data.items);
    }
  }

  async function handleComplete(instanceId: string) {
    setError(null);
    const res = await fetch(`/api/chores/instances/${instanceId}/complete`, {
      method: "POST",
      credentials: "same-origin"
    });
    if (!res.ok) {
      setError("Could not mark chore as done. Please try again.");
      return;
    }
    await refreshInstances();
  }

  if (!session.isAuthenticated) {
    return null;
  }

  // Group by due date
  const grouped = instances.reduce<Record<string, ChoreInstance[]>>((acc, inst) => {
    (acc[inst.dueDate] ??= []).push(inst);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  const hasPending = instances.some(i => i.status === "Pending");

  return (
    <section>
      <div className="eyebrow">Chores</div>

      {error && <p className="error-text">{error}</p>}

      {instances.length === 0 ? (
        <p className="muted">No chores scheduled for the next 8 days.</p>
      ) : (
        <div className="stack-list">
          {sortedDates.map(date => {
            const dayInstances = grouped[date];
            const label = formatDueLabel(date, todayStr, tomorrowStr);
            const isToday = date === todayStr;

            return (
              <div key={date}>
                <div
                  className="eyebrow"
                  style={{ marginTop: "12px", marginBottom: "6px", fontSize: "0.75rem" }}
                >
                  {label}
                </div>
                {dayInstances.map(inst => {
                  const isPast = date < todayStr;
                  const isOverdue = isPast && inst.status === "Pending";
                  return (
                    <div
                      key={inst.id}
                      className={`stack-card${isToday ? " stack-card-today" : ""}${isOverdue ? " stack-card-overdue" : ""}`}
                      style={{ marginBottom: "6px" }}
                    >
                      <div className="stack-card-header">
                        <div>
                          <strong>{inst.choreTitle}</strong>
                          {inst.assignedToDisplayName && (
                            <div
                              className="muted"
                              style={{ fontSize: "0.82rem", marginTop: "2px" }}
                            >
                              {inst.assignedToDisplayName}
                            </div>
                          )}
                          {inst.completedByDisplayName && (
                            <div
                              className="muted"
                              style={{ fontSize: "0.8rem", marginTop: "2px" }}
                            >
                              Done by {inst.completedByDisplayName}
                            </div>
                          )}
                        </div>
                        <div className="action-row compact-action-row">
                          {statusPill(inst.status)}
                          {inst.status === "Pending" && (
                            <button
                              className="action-button action-button-ghost"
                              onClick={() =>
                                startTransition(() => handleComplete(inst.id))
                              }
                              disabled={isPending}
                            >
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {!hasPending && instances.length > 0 && (
        <p className="muted" style={{ marginTop: "10px", fontSize: "0.85rem" }}>
          All chores for the next 8 days are done.
        </p>
      )}
    </section>
  );
}
