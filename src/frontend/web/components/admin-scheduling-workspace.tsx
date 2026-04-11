"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type RecurrencePattern = "None" | "Daily" | "Weekly";

type ScheduledEventSeriesItem = {
  id: string;
  title: string;
  description: string | null;
  isAllDay: boolean;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceSummary: string;
  weeklyDays: string[];
  recursUntilUtc: string | null;
  isImported: boolean;
  sourceKind: string | null;
  nextOccurrenceStartsAtUtc: string | null;
  createdAtUtc: string;
};

type ScheduledEventSeriesListResponse = {
  items: ScheduledEventSeriesItem[];
};

type ScheduleBrowseItem = {
  eventId: string;
  title: string;
  description: string | null;
  isAllDay: boolean;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceSummary: string;
  isImported: boolean;
  sourceKind: string | null;
};

type ScheduleBrowseDayGroup = {
  date: string;
  items: ScheduleBrowseItem[];
};

type ScheduleBrowseResponse = {
  windowStartUtc: string;
  windowEndUtc: string;
  windowDays: number;
  days: ScheduleBrowseDayGroup[];
};

type BrowseFilter = "All" | "Recurring" | "OneTime";

const browseWindowOptions = [7, 14, 30] as const;
const schedulingWorkspaceStorageKeys = {
  windowDays: "householdops:scheduling-window-days",
  browseFilter: "householdops:scheduling-browse-filter"
} as const;

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

function dayHeading(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  return value.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

function weekdayHeading(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  return value.toLocaleDateString(undefined, {
    weekday: "short"
  });
}

function formatEventTime(item: { isAllDay: boolean; startsAtUtc: string | null; endsAtUtc: string | null }) {
  if (item.isAllDay) {
    return "All day";
  }

  if (!item.startsAtUtc) {
    return "Unscheduled";
  }

  const starts = new Date(item.startsAtUtc).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  if (!item.endsAtUtc) {
    return starts;
  }

  const ends = new Date(item.endsAtUtc).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  return `${starts} - ${ends}`;
}

function recurrenceBadge(item: { isRecurring: boolean; recurrencePattern: RecurrencePattern }) {
  if (!item.isRecurring || item.recurrencePattern === "None") {
    return "One-time";
  }

  return item.recurrencePattern;
}

function sourceBadge(item: { isImported: boolean; sourceKind: string | null }) {
  if (!item.isImported) {
    return "Local";
  }

  if (item.sourceKind === "GoogleCalendarIcs") {
    return "Imported from Google";
  }

  return "Imported";
}

function relativeDayLabel(date: string) {
  const target = new Date(`${date}T00:00:00Z`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const differenceInDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (differenceInDays === 0) {
    return "Today";
  }

  if (differenceInDays === 1) {
    return "Tomorrow";
  }

  if (differenceInDays === -1) {
    return "Yesterday";
  }

  return null;
}

function getCurrentWindowStartIso() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

function normalizeUtcDayStart(value: string) {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  ).toISOString();
}

function addUtcDays(startUtc: string, days: number) {
  const date = new Date(startUtc);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function isSameUtcDay(left: string, right: string) {
  return normalizeUtcDayStart(left) === normalizeUtcDayStart(right);
}

function framePositionLabel(startUtc: string) {
  const todayStartUtc = getCurrentWindowStartIso();

  if (isSameUtcDay(startUtc, todayStartUtc)) {
    return "Current frame";
  }

  return startUtc < todayStartUtc ? "Past frame" : "Future frame";
}

function formatFrameRange(startUtc: string, endUtc: string) {
  return `${new Date(startUtc).toLocaleDateString()} - ${new Date(endUtc).toLocaleDateString()}`;
}

export function AdminSchedulingWorkspace() {
  const hydratedPreferencesRef = useRef(false);
  const initialState = useMemo(() => createDefaultState(), []);
  const [title, setTitle] = useState(initialState.title);
  const [description, setDescription] = useState(initialState.description);
  const [startsAtLocal, setStartsAtLocal] = useState(initialState.startsAtLocal);
  const [endsAtLocal, setEndsAtLocal] = useState(initialState.endsAtLocal);
  const [isAllDay, setIsAllDay] = useState(initialState.isAllDay);
  const [recurrencePattern, setRecurrencePattern] =
    useState<RecurrencePattern>(initialState.recurrencePattern);
  const [weeklyDays, setWeeklyDays] = useState<string[]>(initialState.weeklyDays);
  const [recursUntilLocal, setRecursUntilLocal] = useState(initialState.recursUntilLocal);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [browse, setBrowse] = useState<ScheduleBrowseResponse | null>(null);
  const [managedEvents, setManagedEvents] = useState<ScheduledEventSeriesItem[]>([]);
  const [browseWindowDays, setBrowseWindowDays] = useState(14);
  const [browseStartUtc, setBrowseStartUtc] = useState<string | null>(null);
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>("All");
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

  async function refreshBrowse(startUtc = browseStartUtc, windowDays = browseWindowDays) {
    const searchParams = new URLSearchParams();
    searchParams.set("days", windowDays.toString());

    if (startUtc) {
      searchParams.set("startUtc", startUtc);
    }

    const response = await fetch(`/api/scheduling/events/browse?${searchParams.toString()}`, {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      setBrowse(null);
      throw new Error(`Scheduling browse failed with ${response.status}.`);
    }

    const data = (await response.json()) as ScheduleBrowseResponse;
    setBrowse(data);
    setBrowseStartUtc(data.windowStartUtc);
    setBrowseWindowDays(data.windowDays);
  }

  async function refreshSeries() {
    const response = await fetch("/api/scheduling/events/series", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      setManagedEvents([]);
      throw new Error(`Series lookup failed with ${response.status}.`);
    }

    const data = (await response.json()) as ScheduledEventSeriesListResponse;
    setManagedEvents(data.items);
  }

  async function refreshAll(options?: {
    startUtc?: string | null;
    windowDays?: number;
  }) {
    setError(null);
    await Promise.all([
      refreshBrowse(
        options?.startUtc ?? browseStartUtc,
        options?.windowDays ?? browseWindowDays
      ),
      refreshSeries()
    ]);
  }

  useEffect(() => {
    let storedWindowDays = 14;

    if (typeof window !== "undefined") {
      const storedWindowValue = window.localStorage.getItem(
        schedulingWorkspaceStorageKeys.windowDays
      );
      const parsedWindowValue = storedWindowValue
        ? Number.parseInt(storedWindowValue, 10)
        : Number.NaN;

      if (browseWindowOptions.includes(parsedWindowValue as 7 | 14 | 30)) {
        storedWindowDays = parsedWindowValue;
        setBrowseWindowDays(parsedWindowValue);
      }

      const storedFilterValue = window.localStorage.getItem(
        schedulingWorkspaceStorageKeys.browseFilter
      );

      if (
        storedFilterValue === "All"
        || storedFilterValue === "Recurring"
        || storedFilterValue === "OneTime"
      ) {
        setBrowseFilter(storedFilterValue);
      }
    }

    hydratedPreferencesRef.current = true;

    startTransition(() => {
      refreshAll({
        startUtc: getCurrentWindowStartIso(),
        windowDays: storedWindowDays
      }).catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load scheduling workspace."
        );
      });
    });
  }, []);

  useEffect(() => {
    if (!hydratedPreferencesRef.current || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      schedulingWorkspaceStorageKeys.windowDays,
      browseWindowDays.toString()
    );
  }, [browseWindowDays]);

  useEffect(() => {
    if (!hydratedPreferencesRef.current || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      schedulingWorkspaceStorageKeys.browseFilter,
      browseFilter
    );
  }, [browseFilter]);

  const filteredBrowseDays = useMemo(() => {
    if (!browse) {
      return [];
    }

    return browse.days
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          browseFilter === "All"
            ? true
            : browseFilter === "Recurring"
              ? item.isRecurring
              : !item.isRecurring
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [browse, browseFilter]);

  const filteredManagedEvents = useMemo(() => {
    return managedEvents.filter((item) =>
      browseFilter === "All"
        ? true
        : browseFilter === "Recurring"
          ? item.isRecurring
          : !item.isRecurring
    );
  }, [managedEvents, browseFilter]);

  const browseSummary = useMemo(() => {
    if (!browse) {
      return null;
    }

    const weekdayCounts = new Map<string, number>();
    const allItems = filteredBrowseDays.flatMap((group) => group.items);

    for (const group of filteredBrowseDays) {
      weekdayCounts.set(
        weekdayHeading(group.date),
        (weekdayCounts.get(weekdayHeading(group.date)) ?? 0) + group.items.length
      );
    }

    const busiestDay = filteredBrowseDays.length === 0
      ? null
      : filteredBrowseDays.reduce((current, group) =>
          group.items.length > current.items.length ? group : current
        );

    const weeklyRhythm = Array.from(weekdayCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 4);

    return {
      totalItems: allItems.length,
      recurringItems: allItems.filter((item) => item.isRecurring).length,
      oneTimeItems: allItems.filter((item) => !item.isRecurring).length,
      activeDays: filteredBrowseDays.length,
      busiestDay,
      weeklyRhythm
    };
  }, [browse, filteredBrowseDays]);

  function shiftBrowseWindow(direction: -1 | 1) {
    if (!browse) {
      return;
    }

    startTransition(() => {
      refreshBrowse(
        addUtcDays(browse.windowStartUtc, browse.windowDays * direction),
        browse.windowDays
      ).catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load scheduling workspace."
        );
      });
    });
  }

  function applyWindowDays(nextWindowDays: number) {
    startTransition(() => {
      refreshBrowse(browseStartUtc, nextWindowDays).catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to load scheduling workspace."
        );
      });
    });
  }

  function jumpToCurrentWindow() {
    startTransition(() => {
      refreshBrowse(getCurrentWindowStartIso(), browseWindowDays).catch(
        (refreshError: unknown) => {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Unable to load scheduling workspace."
          );
        }
      );
    });
  }

  function toggleWeeklyDay(day: string) {
    setWeeklyDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day]
    );
  }

  function beginEditing(item: ScheduledEventSeriesItem) {
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
      saveSeries().catch((saveError: unknown) => {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save the scheduled event."
        );
      });
    });
  }

  async function saveSeries() {
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
      deleteSeries(eventId).catch((deleteError: unknown) => {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete the scheduled event."
        );
      });
    });
  }

  async function deleteSeries(eventId: string) {
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

  const isViewingCurrentWindow = browse
    ? isSameUtcDay(browse.windowStartUtc, getCurrentWindowStartIso())
    : true;

  return (
    <section className="scheduling-workspace">
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Scheduling overview</div>
          <h2>Upcoming household activity</h2>
          <p className="muted">
            Browse a clear, explicit schedule frame grouped by day, then jump
            straight into the series that owns each occurrence.
          </p>
          <div className="pill-row">
            <span className="pill">
              Window: {browse ? formatFrameRange(browse.windowStartUtc, browse.windowEndUtc) : "Loading"}
            </span>
            <span className="pill">
              Frame: {browse?.windowDays ?? browseWindowDays} days
            </span>
            <span className="pill">
              {browse ? framePositionLabel(browse.windowStartUtc) : "Loading frame"}
            </span>
            <span className="pill">Series-level edits only</span>
            <span className="pill">
              {managedEvents.filter((item) => item.isRecurring).length} recurring series
            </span>
          </div>
        </article>

        <article className="panel">
          <div className="eyebrow">Management policy</div>
          <h2>Whole-series lifecycle</h2>
          <p className="muted">
            One-time, daily, and weekly events are all edited or deleted at the
            series level in this phase. Imported external events remain read-only,
            and occurrence-only changes are intentionally out of scope.
          </p>
          <div className="pill-row">
            <button
              className={`pill-button ${browseFilter === "All" ? "pill-button-active" : ""}`}
              onClick={() => setBrowseFilter("All")}
              disabled={isPending}
            >
              All items
            </button>
            <button
              className={`pill-button ${browseFilter === "Recurring" ? "pill-button-active" : ""}`}
              onClick={() => setBrowseFilter("Recurring")}
              disabled={isPending}
            >
              Recurring only
            </button>
            <button
              className={`pill-button ${browseFilter === "OneTime" ? "pill-button-active" : ""}`}
              onClick={() => setBrowseFilter("OneTime")}
              disabled={isPending}
            >
              One-time only
            </button>
          </div>
          <div className="action-row">
            <button
              className={`pill-button ${isViewingCurrentWindow ? "pill-button-active" : ""}`}
              onClick={jumpToCurrentWindow}
              disabled={isPending || isViewingCurrentWindow}
            >
              Today
            </button>
            <button
              className="action-button action-button-ghost"
              onClick={() => shiftBrowseWindow(-1)}
              disabled={isPending || !browse}
            >
              Previous Frame
            </button>
            <button
              className="action-button action-button-ghost"
              onClick={() => shiftBrowseWindow(1)}
              disabled={isPending || !browse}
            >
              Next Frame
            </button>
            {browseWindowOptions.map((windowDays) => (
              <button
                className={`pill-button ${browseWindowDays === windowDays ? "pill-button-active" : ""}`}
                key={windowDays}
                onClick={() => applyWindowDays(windowDays)}
                disabled={isPending}
              >
                {windowDays} days
              </button>
            ))}
            <button
              className="action-button action-button-ghost"
              onClick={() =>
                startTransition(() => {
                  refreshAll().catch((refreshError: unknown) => {
                    setError(
                      refreshError instanceof Error
                        ? refreshError.message
                        : "Unable to load scheduling workspace."
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
      </section>

      <div className="section-spacer" />

      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Browse summary</div>
          <h2>Frame rhythm at a glance</h2>
          <p className="muted">
            This summary stays tied to the active Scheduling browse frame and the
            current item filter so owners can scan the next stretch of household
            activity quickly.
          </p>
          {browseSummary ? (
            <div className="summary-grid">
              <div className="stack-card">
                <div className="eyebrow">Visible items</div>
                <div className="summary-stat">{browseSummary.totalItems}</div>
                <div className="muted">
                  Across {browseSummary.activeDays} active day
                  {browseSummary.activeDays === 1 ? "" : "s"} in this frame
                </div>
              </div>
              <div className="stack-card">
                <div className="eyebrow">Recurring share</div>
                <div className="summary-stat">{browseSummary.recurringItems}</div>
                <div className="muted">
                  {browseSummary.oneTimeItems} one-time occurrence
                  {browseSummary.oneTimeItems === 1 ? "" : "s"}
                </div>
              </div>
              <div className="stack-card">
                <div className="eyebrow">Busiest day</div>
                <div className="summary-stat summary-stat-small">
                  {browseSummary.busiestDay ? dayHeading(browseSummary.busiestDay.date) : "None"}
                </div>
                <div className="muted">
                  {browseSummary.busiestDay
                    ? `${browseSummary.busiestDay.items.length} item${browseSummary.busiestDay.items.length === 1 ? "" : "s"} in the current frame`
                    : "No activity in the current frame"}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">Loading frame summary...</p>
          )}
        </article>

        <article className="panel">
          <div className="eyebrow">Weekly rhythm</div>
          <h2>Where the schedule clusters</h2>
          <p className="muted">
            A lightweight read of the active frame, derived from the same Scheduling
            browse data rather than a second scheduling model.
          </p>
          {browseSummary && browseSummary.weeklyRhythm.length > 0 ? (
            <div className="stack-list">
              {browseSummary.weeklyRhythm.map(([weekday, count]) => (
                <div className="stack-card rhythm-row" key={weekday}>
                  <strong>{weekday}</strong>
                  <div className="muted">
                    {count} visible occurrence{count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No weekly rhythm to summarize for the current frame.</p>
          )}
        </article>
      </section>

      <div className="section-spacer" />

      <section className="grid scheduling-grid">
        <article className="panel scheduling-browse-panel">
          <h2>Browse by day</h2>
          {filteredBrowseDays.length ? (
            <div className="day-group-list">
              {filteredBrowseDays.map((group) => (
                <section className="day-group" key={group.date}>
                  <div className="stack-card day-group-summary">
                    <div className="stack-card-header">
                      <div>
                        <div className="day-group-heading">{dayHeading(group.date)}</div>
                        <div className="muted">
                          {group.items.length} item{group.items.length === 1 ? "" : "s"} |{" "}
                          {group.items.filter((item) => item.isRecurring).length} recurring
                        </div>
                      </div>
                      {relativeDayLabel(group.date) ? (
                        <span className="pill">{relativeDayLabel(group.date)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="stack-list">
                    {group.items.map((item) => (
                      <div
                        className="stack-card schedule-occurrence-card"
                        key={`${item.eventId}-${item.startsAtUtc ?? "none"}`}
                      >
                        <div className="stack-card-header">
                          <div>
                            <strong>{item.title}</strong>
                            <div className="muted">
                              {formatEventTime(item)}
                            </div>
                          </div>
                          <div className="pill-row">
                            <span className="pill">{recurrenceBadge(item)}</span>
                            <span className="pill">{sourceBadge(item)}</span>
                          </div>
                        </div>
                        <div className="muted">{item.recurrenceSummary}</div>
                        {item.description ? <div>{item.description}</div> : null}
                        {item.isImported ? (
                          <div className="muted">
                            Imported events are managed from the Calendar integrations
                            panel.
                          </div>
                        ) : (
                          <div className="action-row compact-action-row">
                            <button
                              className="action-button action-button-ghost"
                              onClick={() => {
                                const target = managedEvents.find(
                                  (managedEvent) => managedEvent.id === item.eventId
                                );

                                if (target) {
                                  beginEditing(target);
                                }
                              }}
                              disabled={isPending}
                            >
                              Edit Owning Series
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="muted">
              No household activity matches the current browse frame and filter.
            </p>
          )}
        </article>

        <article className="panel">
          <div className="eyebrow">Series editor</div>
        <h2>{editingEventId ? "Edit scheduled event series" : "Create scheduled event series"}</h2>
        <p className="muted">
          This form manages whole scheduled events. Recurrence stays narrow and
          explicit: one-time, daily, or weekly with selected weekdays. Imported
          calendars flow in separately and stay read-only here.
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
          </div>
        </article>
      </section>

      <div className="section-spacer" />

      <article className="panel">
        <div className="eyebrow">Series management</div>
        <h2>Managed scheduled events</h2>
        <p className="muted">
          This list shows each scheduled event once, with recurrence details and the
          next upcoming occurrence when available.
        </p>

        {filteredManagedEvents.length === 0 ? (
          <p className="muted">No scheduled events have been created yet.</p>
        ) : (
          <div className="stack-list">
            {filteredManagedEvents.map((item) => (
              <div className="stack-card" key={item.id}>
                <div className="stack-card-header">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.recurrenceSummary}</div>
                  </div>
                  <div className="pill-row">
                    <span className="pill">{recurrenceBadge(item)}</span>
                    <span className="pill">{sourceBadge(item)}</span>
                    <span className="pill">
                      {item.nextOccurrenceStartsAtUtc
                        ? `Next ${new Date(item.nextOccurrenceStartsAtUtc).toLocaleString()}`
                        : "No upcoming occurrence"}
                    </span>
                  </div>
                </div>
                <div className="muted">
                  Starts {item.startsAtUtc ? new Date(item.startsAtUtc).toLocaleString() : "Unscheduled"}
                  {item.endsAtUtc
                    ? ` | Ends ${new Date(item.endsAtUtc).toLocaleString()}`
                    : ""}
                </div>
                {item.description ? <div>{item.description}</div> : null}
                {item.isImported ? (
                  <div className="muted">
                    Imported series update through Integration sync, not direct Scheduling
                    edits.
                  </div>
                ) : (
                  <div className="action-row compact-action-row">
                    <button
                      className="action-button action-button-ghost"
                      onClick={() => beginEditing(item)}
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
                )}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
