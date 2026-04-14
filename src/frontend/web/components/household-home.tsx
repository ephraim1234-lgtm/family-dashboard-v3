"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useAdminOwnerSession } from "./use-admin-owner-session";

type HouseholdMemberOption = {
  membershipId: string;
  displayName: string;
};

type HomeEvent = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isImported: boolean;
};

type HomeChore = {
  id: string;
  title: string;
  assignedMembershipId: string | null;
  assignedMemberName: string | null;
  completedToday: boolean;
};

type HomeNote = {
  id: string;
  title: string;
  body: string | null;
  authorDisplayName: string;
};

type HomeActivityItem = {
  kind: "ChoreCompletion" | "NoteCreated" | "ReminderFired";
  title: string;
  detail: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
};

type HomeUpcomingEvent = {
  scheduledEventId: string;
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isImported: boolean;
};

type HomeUpcomingDay = {
  date: string;
  events: HomeUpcomingEvent[];
};

type HomeReminder = {
  id: string;
  eventTitle: string;
  minutesBefore: number;
  dueAtUtc: string;
};

type HomeMemberChoreProgress = {
  memberDisplayName: string;
  completionsThisWeek: number;
  currentStreakDays: number;
};

type HomeResponse = {
  todayEvents: HomeEvent[];
  todayChores: HomeChore[];
  pinnedNotes: HomeNote[];
  recentActivity: HomeActivityItem[];
  upcomingDays: HomeUpcomingDay[];
  pendingReminders: HomeReminder[];
  memberChoreProgress: HomeMemberChoreProgress[];
  upcomingEventCount: number;
  pendingReminderCount: number;
};

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatWeekdayShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString([], { weekday: "short" });
}

export function HouseholdHome() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const { isOwner } = useAdminOwnerSession();
  const [members, setMembers] = useState<HouseholdMemberOption[]>([]);

  // Note creation state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  // Reminder creation state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderEventId, setReminderEventId] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState("30");

  // Event creation state
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");

  // Success messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/home", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setLoaded(true);
        return;
      }
      throw new Error(`Failed to load home: ${res.status}`);
    }

    const d = (await res.json()) as HomeResponse;
    setData(d);
    setCompletedIds(new Set());
    setLoaded(true);
  }, []);

  useEffect(() => {
    startTransition(() => {
      load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load home.");
        setLoaded(true);
      });
    });
  }, [load]);

  // Owners get a members list so they can inline-reassign chores from a
  // dropdown on each row. Non-owners skip the fetch entirely.
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/households/members", {
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          items: { membershipId: string; displayName: string }[];
        };
        if (!cancelled) {
          setMembers(
            body.items.map((m) => ({
              membershipId: m.membershipId,
              displayName: m.displayName
            }))
          );
        }
      } catch {
        // Best-effort; reassign dropdown just won't render.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  async function reassignChore(choreId: string, membershipId: string | null) {
    const res = await fetch(`/api/chores/${choreId}/assignee`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: membershipId })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Reassign failed with ${res.status}.`);
    }
    await load();
  }

  function handleReassign(choreId: string, membershipId: string | null) {
    setError(null);
    startTransition(() => {
      reassignChore(choreId, membershipId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to reassign chore.");
      });
    });
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function refresh() {
    setError(null);
    await load();
  }

  // ── Chore completion ──
  async function completeChore(choreId: string) {
    const res = await fetch(`/api/chores/${choreId}/complete`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: null }),
    });
    if (!res.ok) throw new Error(`Complete failed with ${res.status}.`);
    setCompletedIds((prev) => new Set([...prev, choreId]));
  }

  function handleComplete(choreId: string) {
    startTransition(() => {
      completeChore(choreId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to complete chore.");
      });
    });
  }

  // ── Note creation ──
  async function addNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: noteTitle.trim(),
        body: noteBody.trim() || null,
      }),
    });
    if (!res.ok) throw new Error(`Add note failed with ${res.status}.`);
    setNoteTitle("");
    setNoteBody("");
    setShowNoteForm(false);
    showSuccess("Note added.");
    await refresh();
  }

  function handleAddNote() {
    if (!noteTitle.trim()) return;
    startTransition(() => {
      addNote().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to add note.");
      });
    });
  }

  // ── Note pin toggle ──
  async function togglePin(noteId: string) {
    const res = await fetch(`/api/notes/${noteId}/pin`, {
      method: "PATCH",
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error(`Pin toggle failed with ${res.status}.`);
    await refresh();
  }

  function handleTogglePin(noteId: string) {
    startTransition(() => {
      togglePin(noteId).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to toggle pin.");
      });
    });
  }

  // ── Reminder triage ──
  async function dismissReminder(id: string) {
    const res = await fetch(`/api/notifications/reminders/${id}/dismiss`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error(`Dismiss failed with ${res.status}.`);
    showSuccess("Reminder dismissed.");
    await refresh();
  }

  function handleDismissReminder(id: string) {
    startTransition(() => {
      dismissReminder(id).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to dismiss reminder.");
      });
    });
  }

  async function snoozeReminder(id: string, snoozeMinutes: number) {
    const res = await fetch(`/api/notifications/reminders/${id}/snooze`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snoozeMinutes }),
    });
    if (!res.ok) throw new Error(`Snooze failed with ${res.status}.`);
    showSuccess(snoozeMinutes >= 1440 ? "Snoozed 1 day." : "Snoozed 1 hour.");
    await refresh();
  }

  function handleSnoozeReminder(id: string, snoozeMinutes: number) {
    startTransition(() => {
      snoozeReminder(id, snoozeMinutes).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to snooze reminder.");
      });
    });
  }

  // ── Reminder creation ──
  async function addReminder() {
    const minutes = parseInt(reminderMinutes, 10);
    if (!reminderEventId || !Number.isFinite(minutes) || minutes < 1) return;
    const res = await fetch("/api/notifications/reminders", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledEventId: reminderEventId,
        minutesBefore: minutes,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with ${res.status}.`);
    }
    setReminderEventId("");
    setReminderMinutes("30");
    setShowReminderForm(false);
    showSuccess("Reminder scheduled.");
    await refresh();
  }

  function handleAddReminder() {
    startTransition(() => {
      addReminder().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to schedule reminder.");
      });
    });
  }

  // ── Event creation ──
  async function addEvent() {
    const body = {
      title: eventTitle.trim(),
      description: eventDesc.trim() || null,
      isAllDay: eventAllDay,
      startsAtUtc: eventStart ? new Date(eventStart).toISOString() : null,
      endsAtUtc: eventEnd ? new Date(eventEnd).toISOString() : null,
    };
    const res = await fetch("/api/scheduling/events/member", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with ${res.status}.`);
    }
    setEventTitle("");
    setEventDesc("");
    setEventAllDay(false);
    setEventStart("");
    setEventEnd("");
    setShowEventForm(false);
    showSuccess("Event added.");
    await refresh();
  }

  function handleAddEvent() {
    if (!eventTitle.trim()) return;
    startTransition(() => {
      addEvent().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to add event.");
      });
    });
  }

  if (!loaded) return null;

  if (!data) {
    return (
      <section className="grid">
        <article className="panel">
          <p className="muted">Sign in to see your household home.</p>
        </article>
      </section>
    );
  }

  const incompleteChores = data.todayChores.filter(
    (c) => !c.completedToday && !completedIds.has(c.id)
  );
  const doneChores = data.todayChores.filter(
    (c) => c.completedToday || completedIds.has(c.id)
  );

  const hasTodayContent =
    data.todayEvents.length > 0 ||
    data.todayChores.length > 0 ||
    data.pendingReminderCount > 0;

  return (
    <>
      {error ? (
        <section className="grid">
          <article className="panel">
            <p className="error-text">{error}</p>
          </article>
        </section>
      ) : null}

      {successMsg ? (
        <section className="grid">
          <article className="panel">
            <p className="success-text">{successMsg}</p>
          </article>
        </section>
      ) : null}

      {/* ── Today ── */}
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Today</div>
          <h2>What matters now</h2>

          {!hasTodayContent ? (
            <p className="muted" style={{ marginTop: "8px" }}>
              Nothing scheduled for today. Enjoy the calm.
            </p>
          ) : null}

          {data.pendingReminderCount > 0 ? (
            <p className="muted" style={{ marginTop: "8px" }}>
              {data.pendingReminderCount} pending reminder
              {data.pendingReminderCount !== 1 ? "s" : ""}
            </p>
          ) : null}

          {data.todayEvents.length > 0 ? (
            <>
              <div className="eyebrow" style={{ marginTop: "16px" }}>
                Events
              </div>
              <div className="stack-list" style={{ marginTop: "8px" }}>
                {data.todayEvents.map((e, i) => (
                  <div className="stack-card" key={i}>
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{e.title}</strong>
                        {!e.isAllDay && e.startsAtUtc ? (
                          <div className="muted">
                            {formatTime(e.startsAtUtc)}
                            {e.endsAtUtc ? ` – ${formatTime(e.endsAtUtc)}` : ""}
                          </div>
                        ) : (
                          <div className="muted">All day</div>
                        )}
                      </div>
                      {e.isImported ? (
                        <span className="pill home-source-pill">Synced</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {incompleteChores.length > 0 ? (
            <>
              <div
                className="eyebrow home-attention-label"
                style={{ marginTop: "16px" }}
              >
                Chores — needs attention
              </div>
              <div className="stack-list" style={{ marginTop: "8px" }}>
                {incompleteChores.map((c) => (
                  <div className="stack-card home-attention-card" key={c.id}>
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{c.title}</strong>
                        {isOwner && members.length > 0 ? (
                          <div style={{ marginTop: "4px" }}>
                            <select
                              value={c.assignedMembershipId ?? ""}
                              onChange={(e) =>
                                handleReassign(
                                  c.id,
                                  e.target.value === "" ? null : e.target.value
                                )
                              }
                              disabled={isPending}
                              style={{ fontSize: "0.82rem" }}
                              aria-label={`Reassign ${c.title}`}
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.membershipId} value={m.membershipId}>
                                  {m.displayName}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : c.assignedMemberName ? (
                          <div className="muted" style={{ fontSize: "0.82rem" }}>
                            {c.assignedMemberName}
                          </div>
                        ) : null}
                      </div>
                      <button
                        className="action-button"
                        onClick={() => handleComplete(c.id)}
                        disabled={isPending}
                        style={{ fontSize: "0.85rem", padding: "8px 14px" }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {doneChores.length > 0 ? (
            <>
              <div className="eyebrow" style={{ marginTop: "16px" }}>
                Chores — completed
              </div>
              <div className="stack-list" style={{ marginTop: "8px" }}>
                {doneChores.map((c) => (
                  <div className="stack-card" key={c.id} style={{ opacity: 0.6 }}>
                    <div className="stack-card-header">
                      <div>
                        <strong>{c.title}</strong>
                        {c.assignedMemberName ? (
                          <div className="muted" style={{ fontSize: "0.82rem" }}>
                            {c.assignedMemberName}
                          </div>
                        ) : null}
                      </div>
                      <span className="pill" style={{ fontSize: "0.75rem" }}>
                        Done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </article>
      </section>

      {/* ── Reminder triage ── */}
      {data.pendingReminders.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Reminders</div>
              <h2>Upcoming reminders</h2>
              <p className="muted" style={{ marginTop: "4px" }}>
                Dismiss or snooze pending reminders in the next 7 days.
              </p>
              <div className="stack-list" style={{ marginTop: "12px" }}>
                {data.pendingReminders.map((r) => {
                  const due = new Date(r.dueAtUtc);
                  const dueLabel =
                    due.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
                    " " +
                    due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div className="stack-card" key={r.id}>
                      <div className="stack-card-header">
                        <div style={{ flex: 1 }}>
                          <strong>{r.eventTitle}</strong>
                          <div className="muted" style={{ fontSize: "0.82rem" }}>
                            Due {dueLabel} &middot; {r.minutesBefore} min before event
                          </div>
                        </div>
                        <div className="pill-row" style={{ flexShrink: 0 }}>
                          <button
                            className="action-button-secondary"
                            style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                            onClick={() => handleSnoozeReminder(r.id, 60)}
                            disabled={isPending}
                          >
                            Snooze 1h
                          </button>
                          <button
                            className="action-button-secondary"
                            style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                            onClick={() => handleSnoozeReminder(r.id, 1440)}
                            disabled={isPending}
                          >
                            Snooze 1d
                          </button>
                          <button
                            className="action-button"
                            style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                            onClick={() => handleDismissReminder(r.id)}
                            disabled={isPending}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {/* ── Pinned notes with unpin ── */}
      {data.pinnedNotes.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Pinboard</div>
              <h2>Pinned notes</h2>
              <div className="stack-list" style={{ marginTop: "12px" }}>
                {data.pinnedNotes.map((n) => (
                  <div className="stack-card" key={n.id}>
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{n.title}</strong>
                        {n.body ? <div className="muted">{n.body}</div> : null}
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {n.authorDisplayName}
                        </div>
                      </div>
                      <button
                        className="action-button-secondary"
                        style={{ fontSize: "0.75rem", padding: "6px 10px", alignSelf: "flex-start" }}
                        onClick={() => handleTogglePin(n.id)}
                        disabled={isPending}
                      >
                        Unpin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {/* ── Quick actions: add note / add event ── */}
      <div className="section-spacer" />
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Quick actions</div>
          <h2>Add something</h2>

          {/* ── Note form ── */}
          {showNoteForm ? (
            <div className="stack-list" style={{ marginTop: "12px" }}>
              <div className="stack-card">
                <div className="form-row">
                  <label className="form-label">Note title *</label>
                  <input
                    className="form-input"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note title"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Body</label>
                  <textarea
                    className="form-input"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Optional body"
                    rows={2}
                  />
                </div>
                <div className="pill-row" style={{ marginTop: "8px" }}>
                  <button
                    className="action-button"
                    onClick={handleAddNote}
                    disabled={isPending || !noteTitle.trim()}
                  >
                    Add note
                  </button>
                  <button
                    className="action-button-secondary"
                    onClick={() => {
                      setShowNoteForm(false);
                      setNoteTitle("");
                      setNoteBody("");
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Event form ── */}
          {showEventForm ? (
            <div className="stack-list" style={{ marginTop: "12px" }}>
              <div className="stack-card">
                <div className="form-row">
                  <label className="form-label">Event title *</label>
                  <input
                    className="form-input"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Event title"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Description</label>
                  <input
                    className="form-input"
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={eventAllDay}
                      onChange={(e) => setEventAllDay(e.target.checked)}
                      style={{ marginRight: "6px" }}
                    />
                    All day
                  </label>
                </div>
                {!eventAllDay ? (
                  <>
                    <div className="form-row">
                      <label className="form-label">Starts</label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={eventStart}
                        onChange={(e) => setEventStart(e.target.value)}
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Ends</label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={eventEnd}
                        onChange={(e) => setEventEnd(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                <div className="pill-row" style={{ marginTop: "8px" }}>
                  <button
                    className="action-button"
                    onClick={handleAddEvent}
                    disabled={isPending || !eventTitle.trim()}
                  >
                    Add event
                  </button>
                  <button
                    className="action-button-secondary"
                    onClick={() => {
                      setShowEventForm(false);
                      setEventTitle("");
                      setEventDesc("");
                      setEventAllDay(false);
                      setEventStart("");
                      setEventEnd("");
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Reminder form ── */}
          {showReminderForm ? (
            <div className="stack-list" style={{ marginTop: "12px" }}>
              <div className="stack-card">
                {(() => {
                  const timedUpcoming = data.upcomingDays
                    .flatMap((d) => d.events)
                    .filter((e) => !e.isAllDay && e.startsAtUtc);
                  if (timedUpcoming.length === 0) {
                    return (
                      <p className="muted">
                        No upcoming timed events to attach a reminder to.
                      </p>
                    );
                  }
                  return (
                    <>
                      <div className="form-row">
                        <label className="form-label">Event *</label>
                        <select
                          className="form-input"
                          value={reminderEventId}
                          onChange={(e) => setReminderEventId(e.target.value)}
                        >
                          <option value="">Select an event…</option>
                          {timedUpcoming.map((e) => (
                            <option key={e.scheduledEventId} value={e.scheduledEventId}>
                              {e.title} — {formatTime(e.startsAtUtc)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row">
                        <label className="form-label">Minutes before *</label>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          max={10080}
                          value={reminderMinutes}
                          onChange={(e) => setReminderMinutes(e.target.value)}
                        />
                      </div>
                      <div className="pill-row" style={{ marginTop: "8px" }}>
                        <button
                          className="action-button"
                          onClick={handleAddReminder}
                          disabled={isPending || !reminderEventId}
                        >
                          Schedule reminder
                        </button>
                        <button
                          className="action-button-secondary"
                          onClick={() => {
                            setShowReminderForm(false);
                            setReminderEventId("");
                            setReminderMinutes("30");
                          }}
                          disabled={isPending}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          {!showNoteForm && !showEventForm && !showReminderForm ? (
            <div className="pill-row" style={{ marginTop: "12px" }}>
              <button
                className="action-button-secondary"
                onClick={() => setShowNoteForm(true)}
              >
                + Note
              </button>
              <button
                className="action-button-secondary"
                onClick={() => setShowEventForm(true)}
              >
                + Event
              </button>
              <button
                className="action-button-secondary"
                onClick={() => setShowReminderForm(true)}
              >
                + Reminder
              </button>
            </div>
          ) : null}
        </article>
      </section>

      {/* ── Member chore progress ── */}
      {data.memberChoreProgress.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Chores</div>
              <h2>Member progress</h2>
              <p className="muted" style={{ marginTop: "4px" }}>
                Streaks reflect consecutive days with at least one completion.
              </p>
              <div className="stack-list" style={{ marginTop: "12px" }}>
                {data.memberChoreProgress.map((m) => (
                  <div className="stack-card" key={m.memberDisplayName}>
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{m.memberDisplayName}</strong>
                      </div>
                      <div className="pill-row" style={{ flexShrink: 0 }}>
                        <span className="pill" style={{ fontSize: "0.75rem" }}>
                          {m.currentStreakDays} day
                          {m.currentStreakDays !== 1 ? "s" : ""} streak
                        </span>
                        <span className="pill" style={{ fontSize: "0.75rem" }}>
                          {m.completionsThisWeek} this week
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {/* ── Recent activity ── */}
      {data.recentActivity.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Household</div>
              <h2>What changed recently</h2>
              <div className="stack-list" style={{ marginTop: "12px" }}>
                {data.recentActivity.map((item, i) => (
                  <div
                    className="stack-card"
                    key={`${item.kind}-${item.occurredAtUtc}-${i}`}
                  >
                    <div className="stack-card-header">
                      <div style={{ flex: 1 }}>
                        <strong>{item.title}</strong>
                        {item.detail ? (
                          <div className="muted">{item.detail}</div>
                        ) : null}
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {item.kind === "ChoreCompletion"
                            ? `Completed by ${item.actorDisplayName}`
                            : item.kind === "NoteCreated"
                              ? `Note added by ${item.actorDisplayName}`
                              : "Reminder fired"}
                        </div>
                      </div>
                      <span
                        className="pill"
                        style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
                      >
                        {formatRelativeTime(item.occurredAtUtc)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {/* ── Coming up — week at a glance + day-grouped agenda ── */}
      {data.upcomingDays.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Schedule</div>
              <h2>Coming up</h2>
              <p className="muted" style={{ marginTop: "4px" }}>
                {data.upcomingEventCount} event
                {data.upcomingEventCount !== 1 ? "s" : ""} in the next 7 days
              </p>

              {/* Week-at-a-glance summary */}
              <div className="home-week-glance" style={{ marginTop: "14px" }}>
                {data.upcomingDays.map((day) => (
                  <div className="home-week-day" key={day.date}>
                    <div className="home-week-day-label">
                      {formatWeekdayShort(day.date)}
                    </div>
                    <div className="home-week-day-count">{day.events.length}</div>
                  </div>
                ))}
              </div>

              {/* Day-grouped agenda */}
              <div className="day-group-list" style={{ marginTop: "18px" }}>
                {data.upcomingDays.map((day) => (
                  <div className="day-group" key={day.date}>
                    <div className="day-group-heading">
                      {formatDayLabel(day.date)}
                    </div>
                    <div className="stack-list">
                      {day.events.map((e, i) => (
                        <div className="stack-card" key={`${day.date}-${i}`}>
                          <div className="stack-card-header">
                            <div style={{ flex: 1 }}>
                              <strong>{e.title}</strong>
                              {!e.isAllDay && e.startsAtUtc ? (
                                <div className="muted">
                                  {formatTime(e.startsAtUtc)}
                                  {e.endsAtUtc
                                    ? ` – ${formatTime(e.endsAtUtc)}`
                                    : ""}
                                </div>
                              ) : (
                                <div className="muted">All day</div>
                              )}
                            </div>
                            {e.isImported ? (
                              <span className="pill home-source-pill">
                                Synced
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </>
  );
}
