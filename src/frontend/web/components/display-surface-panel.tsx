"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type DisplayAgendaItem = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  description: string | null;
};

type DisplayAgendaSection = {
  windowStartUtc: string;
  windowEndUtc: string;
  nextItem: DisplayAgendaItem | null;
  allDayItems: DisplayAgendaItem[];
  soonItems: DisplayAgendaItem[];
  laterTodayItems: DisplayAgendaItem[];
  upcomingDays: Array<{
    date: string;
    label: string;
    totalCount: number;
    allDayCount: number;
    timedCount: number;
    firstStartsAtUtc: string | null;
  }>;
  upcomingDayGroups: Array<{
    date: string;
    label: string;
    events: DisplayAgendaItem[];
  }>;
  items: DisplayAgendaItem[];
};

type DisplayReminderItem = {
  eventTitle: string;
  minutesBefore: number;
  dueAtUtc: string;
};

type DisplayChoreItem = {
  title: string;
  assignedMemberName: string | null;
  recurrenceKind: string;
};

type DisplayNoteItem = {
  title: string;
  body: string | null;
  authorDisplayName: string;
};

type DisplaySnapshot = {
  accessMode: string;
  deviceName: string;
  householdName: string;
  presentationMode: "Balanced" | "FocusNext";
  agendaDensityMode: "Comfortable" | "Dense";
  accessTokenHint: string;
  generatedAtUtc: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  agendaSection: DisplayAgendaSection;
  upcomingReminders: DisplayReminderItem[];
  dueChores: DisplayChoreItem[];
  pinnedNotes: DisplayNoteItem[];
};

type DisplaySurfacePanelProps = {
  token: string;
};

function formatHeadlineTime(item: DisplayAgendaItem) {
  if (item.isAllDay) {
    return "All day";
  }

  if (!item.startsAtUtc) {
    return "Unscheduled";
  }

  return new Date(item.startsAtUtc).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatAgendaTime(item: DisplayAgendaItem) {
  if (item.isAllDay) {
    return "All day";
  }

  if (!item.startsAtUtc) {
    return "Unscheduled";
  }

  const start = new Date(item.startsAtUtc).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  });

  if (!item.endsAtUtc) {
    return start;
  }

  const end = new Date(item.endsAtUtc).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  return `${start} - ${end}`;
}

function dayLabel(item: DisplayAgendaItem) {
  if (!item.startsAtUtc) {
    return "Later";
  }

  return new Date(item.startsAtUtc).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

const MAX_CONSECUTIVE_FAILURES = 3;

function formatCountdown(startsAtUtc: string, now: Date): string {
  const diffMs = new Date(startsAtUtc).getTime() - now.getTime();
  if (diffMs <= 0) return "Now";
  const totalMinutes = Math.round(diffMs / 60_000);
  if (totalMinutes < 60) return `in ${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `in ${hours} hr` : `in ${hours} hr ${mins} min`;
}

function formatClockTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatClockDate(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export function DisplaySurfacePanel({ token }: DisplaySurfacePanelProps) {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isPending, startTransition] = useTransition();
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    // Align the first tick to the next whole minute, then tick every 60 s.
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();
    const timeout = setTimeout(() => {
      setNow(new Date());
      const interval = setInterval(() => setNow(new Date()), 60_000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);
    return () => clearTimeout(timeout);
  }, []);

  async function refresh() {
    setError(null);

    const response = await fetch(`/api/display/projection/${token}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Display projection request failed.");
    }

    const nextSnapshot = (await response.json()) as DisplaySnapshot;
    setSnapshot(nextSnapshot);
    setLastRefreshedAt(new Date());
    consecutiveFailuresRef.current = 0;
  }

  useEffect(() => {
    function doRefresh() {
      startTransition(() => {
        refresh().catch(() => {
          consecutiveFailuresRef.current += 1;

          if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
            window.location.reload();
            return;
          }

          setError(
            `Unable to load the display surface. Retry ${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES - 1} — will reload if this persists.`
          );
          setSnapshot(null);
        });
      });
    }

    doRefresh();
    const interval = setInterval(doRefresh, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  const remainingAgendaItems = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const nextKey = snapshot.agendaSection.nextItem
      ? `${snapshot.agendaSection.nextItem.title}-${snapshot.agendaSection.nextItem.startsAtUtc ?? "none"}`
      : null;

    const filtered = snapshot.agendaSection.items.filter((item) => {
      if (item.isAllDay) {
        return false;
      }

      const itemKey = `${item.title}-${item.startsAtUtc ?? "none"}`;
      return itemKey !== nextKey;
    });

    const limit =
      snapshot.agendaDensityMode === "Dense"
        ? snapshot.presentationMode === "FocusNext"
          ? 8
          : 12
        : snapshot.presentationMode === "FocusNext"
          ? 4
          : 8;

    return filtered.slice(0, limit);
  }, [snapshot]);

  const daySummaryLimit = snapshot?.agendaDensityMode === "Dense" ? 7 : 4;

  const todayEventCount = useMemo(() => {
    if (!snapshot) return 0;
    const todayDate = now.toISOString().slice(0, 10);
    return snapshot.agendaSection.items.filter(
      (item) => item.startsAtUtc && item.startsAtUtc.slice(0, 10) === todayDate
    ).length;
  }, [snapshot, now]);

  return (
    <section className="display-surface">
      <section className="display-hero-card">
        <div className="display-kicker">
          <span>{snapshot?.householdName ?? "Household display"}</span>
          <span>{snapshot?.deviceName ?? "Loading device"}</span>
          {snapshot ? <span>{snapshot.presentationMode}</span> : null}
          {snapshot ? <span>{snapshot.agendaDensityMode}</span> : null}
        </div>
        <div className="display-clock">
          <div className="display-clock-time">{formatClockTime(now)}</div>
          <div className="display-clock-date">{formatClockDate(now)}</div>
        </div>
        {snapshot ? (
          <div className="display-kicker">
            <span>{todayEventCount === 0 ? "Clear day" : `${todayEventCount} event${todayEventCount === 1 ? "" : "s"} today`}</span>
            {snapshot.agendaSection.allDayItems.length > 0 ? (
              <span>{snapshot.agendaSection.allDayItems.length} all-day</span>
            ) : null}
          </div>
        ) : null}
      </section>

      {snapshot && snapshot.upcomingReminders.length > 0 ? (
        <section className="display-reminders-strip">
          <div className="display-reminders-label">Reminders</div>
          <div className="display-reminders-list">
            {snapshot.upcomingReminders.map((reminder) => (
              <div className="display-reminder-chip" key={`${reminder.eventTitle}-${reminder.dueAtUtc}`}>
                <span className="display-reminder-title">{reminder.eventTitle}</span>
                <span className="display-reminder-meta">
                  {reminder.minutesBefore < 60
                    ? `${reminder.minutesBefore} min`
                    : reminder.minutesBefore === 60
                      ? "1 hr"
                      : `${Math.round(reminder.minutesBefore / 60)} hr`}
                  {" "}·{" "}
                  {new Date(reminder.dueAtUtc).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {snapshot && snapshot.dueChores && snapshot.dueChores.length > 0 ? (
        <section className="display-chores-strip">
          <div className="display-chores-label">Today&apos;s chores</div>
          <div className="display-chip-list">
            {snapshot.dueChores.map((chore) => (
              <div className="display-chip" key={chore.title}>
                <span>{chore.title}</span>
                {chore.assignedMemberName ? (
                  <span className="display-chore-member"> · {chore.assignedMemberName}</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {snapshot && snapshot.pinnedNotes && snapshot.pinnedNotes.length > 0 ? (
        <section className="display-notes-strip">
          <div className="display-notes-label">Pinned notes</div>
          <div className="display-notes-cards">
            {snapshot.pinnedNotes.map((note) => (
              <div className="display-note-card" key={note.title}>
                <div className="display-note-card-title">{note.title}</div>
                {note.body ? (
                  <div className="display-note-card-body">{note.body}</div>
                ) : null}
                <div className="display-note-card-author">{note.authorDisplayName}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isPending && !snapshot ? (
        <article className="panel">
          <p className="muted">Loading display projection...</p>
        </article>
      ) : null}

      {error ? (
        <article className="panel">
          <p className="error-text">{error}</p>
        </article>
      ) : null}

      {snapshot ? (
        <>
          <section className="display-summary-grid">
            <article className="panel display-panel-hero">
              <div className="eyebrow">Next up</div>
              {snapshot.agendaSection.nextItem ? (
                <>
                  <div className="display-next-time">
                    {formatHeadlineTime(snapshot.agendaSection.nextItem)}
                  </div>
                  <h3>{snapshot.agendaSection.nextItem.title}</h3>
                  {snapshot.agendaSection.nextItem.startsAtUtc ? (
                    <div className="display-countdown">
                      {formatCountdown(snapshot.agendaSection.nextItem.startsAtUtc, now)}
                    </div>
                  ) : null}
                  {snapshot.agendaSection.nextItem.description ? (
                    <p className="display-next-description">
                      {snapshot.agendaSection.nextItem.description}
                    </p>
                  ) : null}
                  <div className="display-meta-row">
                    <span className="pill">{dayLabel(snapshot.agendaSection.nextItem)}</span>
                    <span className="pill">{snapshot.presentationMode}</span>
                    <span className="pill">{snapshot.agendaDensityMode}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="display-next-time">Clear</div>
                  <h3>No upcoming timed events</h3>
                  <p className="display-next-description">
                    The current seven-day display window is quiet right now.
                  </p>
                </>
              )}
            </article>

            <article className="panel">
              <div className="eyebrow">All day</div>
              <h3>Household anchors</h3>
              {snapshot.agendaSection.allDayItems.length > 0 ? (
                <div className="display-chip-list">
                  {snapshot.agendaSection.allDayItems.map((item) => (
                    <span
                      className="display-chip"
                      key={`${item.title}-${item.startsAtUtc ?? "all-day"}`}
                    >
                      {item.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">No all-day items in the current display window.</p>
              )}
            </article>

            <article className="panel">
              <div className="eyebrow">Window</div>
              <h3>What the display is showing</h3>
              <dl className="data-list">
                <div>
                  <dt>Range</dt>
                  <dd>
                    {new Date(snapshot.agendaSection.windowStartUtc).toLocaleDateString()} -{" "}
                    {new Date(snapshot.agendaSection.windowEndUtc).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt>Agenda items</dt>
                  <dd>{snapshot.agendaSection.items.length}</dd>
                </div>
                <div>
                  <dt>Soon</dt>
                  <dd>{snapshot.agendaSection.soonItems.length}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{new Date(snapshot.generatedAtUtc).toLocaleTimeString()}</dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="display-summary-grid">
            <article className="panel">
              <div className="eyebrow">Soon</div>
              <h3>Coming up soon</h3>
              {snapshot.agendaSection.soonItems.length > 0 ? (
                <div className="display-chip-list">
                  {snapshot.agendaSection.soonItems
                    .slice(0, snapshot.agendaDensityMode === "Dense" ? 6 : 3)
                    .map((item) => (
                      <span
                        className="display-chip"
                        key={`${item.title}-${item.startsAtUtc ?? "soon"}`}
                      >
                        {formatHeadlineTime(item)} {item.title}
                      </span>
                    ))}
                </div>
              ) : (
                <p className="muted">No additional near-term items after the headline event.</p>
              )}
            </article>

            <article className="panel">
              <div className="eyebrow">Later today</div>
              <h3>Still ahead today</h3>
              {snapshot.agendaSection.laterTodayItems.length > 0 ? (
                <div className="display-agenda-list">
                  {snapshot.agendaSection.laterTodayItems
                    .slice(0, snapshot.agendaDensityMode === "Dense" ? 5 : 3)
                    .map((item) => (
                      <div
                        className="display-agenda-item"
                        key={`${item.title}-${item.startsAtUtc ?? "later-today"}`}
                      >
                        <div className="display-agenda-time">{formatAgendaTime(item)}</div>
                        <div>
                          <strong>{item.title}</strong>
                          {item.description ? <div className="muted">{item.description}</div> : null}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="muted">No additional timed items later today.</p>
              )}
            </article>
          </section>

          <article className="panel">
            <div className="display-section-header">
              <div>
                <div className="eyebrow">At a glance</div>
                <h3>Upcoming day rhythm</h3>
              </div>
              <span className="pill">Display-owned summary</span>
            </div>
            <div className="display-day-summary-grid">
              {snapshot.agendaSection.upcomingDays.slice(0, daySummaryLimit).map((day) => (
                <div className="stack-card display-day-summary-card" key={day.date}>
                  <div className="stack-card-header">
                    <strong>{day.label}</strong>
                    <span className="pill">{day.totalCount} items</span>
                  </div>
                  <div className="muted">
                    {day.allDayCount} all-day | {day.timedCount} timed
                  </div>
                  <div className="muted">
                    {day.firstStartsAtUtc
                      ? `Starts around ${new Date(day.firstStartsAtUtc).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit"
                        })}`
                      : "No timed items"}
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Day-grouped rollup — matches /app "Coming up" shape so a glance
              at the kiosk shows the actual events per day, not just counts. */}
          {snapshot.agendaSection.upcomingDayGroups.length > 0 ? (
            <article className="panel">
              <div className="display-section-header">
                <div>
                  <div className="eyebrow">Day by day</div>
                  <h3>Coming up</h3>
                </div>
                <span className="pill">Grouped by day</span>
              </div>
              <div className="stack-list">
                {snapshot.agendaSection.upcomingDayGroups
                  .slice(0, daySummaryLimit)
                  .map((day) => (
                    <div className="stack-card" key={`group-${day.date}`}>
                      <div className="stack-card-header">
                        <strong>{day.label}</strong>
                        <span className="pill">{day.events.length}</span>
                      </div>
                      <div className="display-agenda-list" style={{ marginTop: "6px" }}>
                        {day.events.map((item) => (
                          <div
                            className="display-agenda-item"
                            key={`${day.date}-${item.title}-${item.startsAtUtc ?? "all"}`}
                          >
                            <div className="display-agenda-time">
                              {formatAgendaTime(item)}
                            </div>
                            <div>
                              <strong>{item.title}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </article>
          ) : null}

          <article className="panel display-agenda-panel">
            <div className="display-section-header">
              <div>
                <div className="eyebrow">Agenda</div>
                <h3>
                  {snapshot.presentationMode === "FocusNext"
                    ? "Immediate household flow"
                    : "Upcoming household agenda"}
                </h3>
              </div>
              <span className="pill">Token-only display access</span>
            </div>

            {remainingAgendaItems.length > 0 ? (
              <div className="display-agenda-list">
                {remainingAgendaItems.map((item) => (
                  <div
                    className="display-agenda-item"
                    key={`${item.title}-${item.startsAtUtc ?? "none"}`}
                  >
                    <div className="display-agenda-time">{formatAgendaTime(item)}</div>
                    <div>
                      <strong>{item.title}</strong>
                      {item.description ? (
                        <div className="muted">{item.description}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No additional upcoming items after the current headline event.</p>
            )}
          </article>

          <footer className="display-footer">
            <span>{snapshot.householdName}</span>
            <span>{snapshot.deviceName}</span>
            <span>Token hint {snapshot.accessTokenHint}</span>
            <span className="display-footer-refresh">
              {lastRefreshedAt
                ? `Refreshed ${lastRefreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
                : "Refreshing…"}
            </span>
          </footer>
        </>
      ) : null}
    </section>
  );
}
