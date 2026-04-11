"use client";

import { useEffect, useState, useTransition } from "react";
import { AdminSchedulingWorkspace } from "./admin-scheduling-workspace";

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

type ScheduledEventSeriesItem = {
  id: string;
  title: string;
  description: string | null;
  isAllDay: boolean;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  recurrencePattern: RecurrencePattern;
  weeklyDays: string[];
  recursUntilUtc: string | null;
  createdAtUtc: string;
};

type ScheduledEventSeriesListResponse = {
  items: ScheduledEventSeriesItem[];
};

type RecurrencePattern = "None" | "Daily" | "Weekly";

const weekdayOptions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
] as const;

function formatLocalInputValue(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createDefaultState() {
  return {
    title: "Morning routine",
    description: "Recurring household check-in",
    startsAtLocal: formatLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
    endsAtLocal: formatLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    isAllDay: false,
    recurrencePattern: "None" as RecurrencePattern,
    weeklyDays: ["Monday"],
    recursUntilLocal: ""
  };
}

function recurrenceSummary(item: ScheduledEventSeriesItem) {
  if (item.recurrencePattern === "Daily") {
    return item.recursUntilUtc
      ? `Daily until ${new Date(item.recursUntilUtc).toLocaleString()}`
      : "Daily";
  }

  if (item.recurrencePattern === "Weekly") {
    const days = item.weeklyDays.length > 0 ? item.weeklyDays.join(", ") : "No weekdays";
    return item.recursUntilUtc
      ? `Weekly on ${days} until ${new Date(item.recursUntilUtc).toLocaleString()}`
      : `Weekly on ${days}`;
  }

  return "One-time";
}

function LegacyAdminSchedulingPanel() {
  const [title, setTitle] = useState(createDefaultState().title);
  const [description, setDescription] = useState(createDefaultState().description);
  const [startsAtLocal, setStartsAtLocal] = useState(createDefaultState().startsAtLocal);
  const [endsAtLocal, setEndsAtLocal] = useState(createDefaultState().endsAtLocal);
  const [isAllDay, setIsAllDay] = useState(createDefaultState().isAllDay);
  const [recurrencePattern, setRecurrencePattern] =
    useState<RecurrencePattern>(createDefaultState().recurrencePattern);
  const [weeklyDays, setWeeklyDays] = useState<string[]>(createDefaultState().weeklyDays);
  const [recursUntilLocal, setRecursUntilLocal] = useState(createDefaultState().recursUntilLocal);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<UpcomingEventItem[]>([]);
  const [managedEvents, setManagedEvents] = useState<ScheduledEventSeriesItem[]>([]);
  const [windowLabel, setWindowLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    const next = createDefaultState();
    setTitle(next.title);
    setDescription(next.description);
    setStartsAtLocal(next.startsAtLocal);
    setEndsAtLocal(next.endsAtLocal);
    setIsAllDay(next.isAllDay);
    setRecurrencePattern(next.recurrencePattern);
    setWeeklyDays(next.weeklyDays);
    setRecursUntilLocal(next.recursUntilLocal);
    setEditingEventId(null);
  }

  async function refreshAgenda() {
    const response = await fetch("/api/scheduling/events", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      setEvents([]);
      setWindowLabel(null);
      throw new Error(`Scheduling lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as UpcomingEventsResponse;
    setEvents(data.items);
    setWindowLabel(
      `${new Date(data.windowStartUtc).toLocaleDateString()} - ${new Date(data.windowEndUtc).toLocaleDateString()}`
    );
  }

  async function refreshManagedEvents() {
    const response = await fetch("/api/scheduling/events/series", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      setManagedEvents([]);
      throw new Error(`Event management lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as ScheduledEventSeriesListResponse;
    setManagedEvents(data.items);
  }

  async function refreshAll() {
    setError(null);
    await Promise.all([refreshAgenda(), refreshManagedEvents()]);
  }

  useEffect(() => {
    startTransition(() => {
      refreshAll().catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load scheduling data."
        );
      });
    });
  }, []);

  function toggleWeeklyDay(day: string) {
    setWeeklyDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day]
    );
  }

  function selectEventForEditing(item: ScheduledEventSeriesItem) {
    setEditingEventId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setStartsAtLocal(
      item.startsAtUtc ? formatLocalInputValue(new Date(item.startsAtUtc)) : ""
    );
    setEndsAtLocal(
      item.endsAtUtc ? formatLocalInputValue(new Date(item.endsAtUtc)) : ""
    );
    setIsAllDay(item.isAllDay);
    setRecurrencePattern(item.recurrencePattern);
    setWeeklyDays(item.weeklyDays);
    setRecursUntilLocal(
      item.recursUntilUtc
        ? formatLocalInputValue(new Date(item.recursUntilUtc))
        : ""
    );
  }

  function handleSubmit() {
    startTransition(() => {
      submitEvent().catch((submitError: unknown) => {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to save the scheduled event."
        );
      });
    });
  }

  async function submitEvent() {
    setError(null);

    const payload = {
      title,
      description,
      isAllDay,
      startsAtUtc: startsAtLocal ? new Date(startsAtLocal).toISOString() : null,
      endsAtUtc: endsAtLocal ? new Date(endsAtLocal).toISOString() : null,
      recurrence:
        recurrencePattern === "None"
          ? null
          : {
              pattern: recurrencePattern,
              weeklyDays:
                recurrencePattern === "Weekly" ? weeklyDays : null,
              recursUntilUtc: recursUntilLocal
                ? new Date(recursUntilLocal).toISOString()
                : null
            }
    };

    const response = await fetch(
      editingEventId
        ? `/api/scheduling/events/${editingEventId}`
        : "/api/scheduling/events",
      {
        method: editingEventId ? "PUT" : "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      setError(await response.text());
      return;
    }

    resetForm();
    await refreshAll();
  }

  function handleDelete(eventId: string) {
    startTransition(() => {
      deleteEvent(eventId).catch((deleteError: unknown) => {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete the scheduled event."
        );
      });
    });
  }

  async function deleteEvent(eventId: string) {
    setError(null);

    const response = await fetch(`/api/scheduling/events/${eventId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!response.ok) {
      setError(`Delete failed with ${response.status}.`);
      return;
    }

    if (editingEventId === eventId) {
      resetForm();
    }

    await refreshAll();
  }

  return (
    <section className="grid">
      <article className="panel">
        <div className="eyebrow">Scheduling</div>
        <h2>{editingEventId ? "Edit scheduled event series" : "Create household events"}</h2>
        <p className="muted">
          This owner-managed workflow edits or deletes the whole event series.
          One-time, daily, and weekly recurring events all stay Scheduling-owned.
        </p>

        <div className="form-stack">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="field">
            <span>Description</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Starts</span>
            <input
              type="datetime-local"
              value={startsAtLocal}
              onChange={(event) => setStartsAtLocal(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Ends</span>
            <input
              type="datetime-local"
              value={endsAtLocal}
              onChange={(event) => setEndsAtLocal(event.target.value)}
            />
          </label>

          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(event) => setIsAllDay(event.target.checked)}
            />
            <span>All day</span>
          </label>

          <label className="field">
            <span>Recurrence</span>
            <select
              value={recurrencePattern}
              onChange={(event) =>
                setRecurrencePattern(event.target.value as RecurrencePattern)
              }
            >
              <option value="None">One-time</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
          </label>

          {recurrencePattern === "Weekly" ? (
            <div className="field">
              <span>Weekly days</span>
              <div className="pill-row">
                {weekdayOptions.map((day) => (
                  <label className="pill checkbox-pill" key={day}>
                    <input
                      type="checkbox"
                      checked={weeklyDays.includes(day)}
                      onChange={() => toggleWeeklyDay(day)}
                    />
                    <span>{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {recurrencePattern !== "None" ? (
            <label className="field">
              <span>Repeat until</span>
              <input
                type="datetime-local"
                value={recursUntilLocal}
                onChange={(event) => setRecursUntilLocal(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        <div className="action-row">
          <button className="action-button" onClick={handleSubmit} disabled={isPending}>
            {editingEventId ? "Save Series Changes" : "Create Event"}
          </button>
          {editingEventId ? (
            <button
              className="action-button action-button-ghost"
              onClick={resetForm}
              disabled={isPending}
            >
              Cancel Editing
            </button>
          ) : null}
          <button
            className="action-button action-button-ghost"
            onClick={() =>
              startTransition(() => {
                refreshAll().catch((refreshError: unknown) => {
                  setError(
                    refreshError instanceof Error
                      ? refreshError.message
                      : "Unable to load scheduling data."
                  );
                });
              })
            }
            disabled={isPending}
          >
            Refresh Scheduling
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </article>

      <article className="panel">
        <h2>Managed event series</h2>
        <p className="muted">
          Edits and deletes apply to the full scheduled event, including recurring
          series. No occurrence-level changes exist in this phase.
        </p>
        {managedEvents.length === 0 ? (
          <p className="muted">No scheduled events have been created yet.</p>
        ) : (
          <div className="stack-list">
            {managedEvents.map((item) => (
              <div className="stack-card" key={item.id}>
                <div className="stack-card-header">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="muted">{recurrenceSummary(item)}</div>
                  </div>
                  <div className="action-row compact-action-row">
                    <button
                      className="action-button action-button-ghost"
                      onClick={() => selectEventForEditing(item)}
                      disabled={isPending}
                    >
                      Edit Series
                    </button>
                    <button
                      className="action-button action-button-secondary"
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                    >
                      Delete Series
                    </button>
                  </div>
                </div>
                <div className="muted">
                  Starts{" "}
                  {item.startsAtUtc
                    ? new Date(item.startsAtUtc).toLocaleString()
                    : "Unscheduled"}
                  {item.endsAtUtc
                    ? ` • Ends ${new Date(item.endsAtUtc).toLocaleString()}`
                    : ""}
                </div>
                {item.description ? <div>{item.description}</div> : null}
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel">
        <h2>Upcoming occurrences</h2>
        <p className="muted">{windowLabel ?? "Loading current agenda window..."}</p>
        {events.length === 0 ? (
          <p className="muted">No upcoming events in the current agenda window.</p>
        ) : (
          <ul className="plain-list">
            {events.map((event) => (
              <li key={`${event.id}-${event.startsAtUtc ?? "none"}`}>
                <strong>
                  {event.startsAtUtc
                    ? new Date(event.startsAtUtc).toLocaleString()
                    : "Unscheduled"}
                </strong>{" "}
                | {event.title}
                {event.description ? (
                  <span className="muted"> ({event.description})</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

export function AdminSchedulingPanel() {
  return <AdminSchedulingWorkspace />;
}
