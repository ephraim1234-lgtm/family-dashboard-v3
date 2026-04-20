"use client";

import { EmptyState, LoadingSpinner } from "@/components/ui";
import { useOverviewContext } from "./overview-context";

export function TodayPanel() {
  const {
    data,
    isLoading,
    error,
    hasTodayContent,
    incompleteChores,
    overdueReminders,
    upcomingReminders,
    handleSnoozeReminder,
    handleDismissReminder,
    formatTime,
    formatReminderDueLabel,
    formatReminderTriageState,
    formatRelativeTime
  } = useOverviewContext();

  if (isLoading) {
    return (
      <section className="grid" aria-busy="true">
        <article className="panel">
          <LoadingSpinner label="Loading your household overview…" />
        </article>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Today</div>
          <h2>What matters now</h2>

          {!hasTodayContent ? <EmptyState className="mt-8" message="Nothing scheduled for today. Enjoy the calm." /> : null}

          {data.pendingReminderCount > 0 ? (
            <p className="muted mt-8">
              {data.pendingReminderCount} pending reminder
              {data.pendingReminderCount !== 1 ? "s" : ""}
            </p>
          ) : null}

          {data.todayEvents.length > 0 ? (
            <>
              <div className="eyebrow mt-16">Events</div>
              <div className="stack-list mt-8">
                {data.todayEvents.map((event, index) => (
                  <div className="stack-card" key={`${event.title}-${index}`}>
                    <div className="stack-card-header">
                      <div className="flex-1">
                        <strong>{event.title}</strong>
                        {!event.isAllDay && event.startsAtUtc ? (
                          <div className="muted">
                            {formatTime(event.startsAtUtc)}
                            {event.endsAtUtc ? ` - ${formatTime(event.endsAtUtc)}` : ""}
                          </div>
                        ) : (
                          <div className="muted">All day</div>
                        )}
                      </div>
                      {event.isImported ? <span className="pill home-source-pill">Synced</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {incompleteChores.length > 0 ? (
            <>
              <div className="eyebrow home-attention-label mt-16">Chores - needs attention</div>
              <div className="stack-list mt-8">
                {incompleteChores.slice(0, 4).map((chore) => (
                  <div className="stack-card home-attention-card" key={chore.id}>
                    <div className="stack-card-header">
                      <div className="flex-1">
                        <strong>{chore.title}</strong>
                        {chore.assignedMemberName ? (
                          <div className="muted text-sm">{chore.assignedMemberName}</div>
                        ) : null}
                      </div>
                      <span className="pill pill-warning text-xs">Open</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </article>
      </section>

      {data.pendingReminders.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Reminders</div>
              <h2>Reminder triage</h2>
              <p className="muted">
                Dismiss or snooze pending reminders. Overdue reminders stay at the top until reviewed.
              </p>

              {overdueReminders.length > 0 ? (
                <>
                  <div className="eyebrow mt-16">Overdue reminders</div>
                  <div className="stack-list mt-8">
                    {overdueReminders.map((reminder) => (
                      <div className="stack-card reminder-overdue-card" key={reminder.id}>
                        <div className="stack-card-header">
                          <div className="flex-1">
                            <strong>{reminder.eventTitle}</strong>
                            <div className="muted">
                              Due {formatReminderDueLabel(reminder.dueAtUtc)} · {reminder.minutesBefore} min before event
                            </div>
                          </div>
                          <span className="pill reminder-overdue-pill">
                            {formatReminderTriageState(reminder.dueAtUtc)}
                          </span>
                        </div>
                        <div className="action-row compact-action-row">
                          <button className="action-button-secondary" onClick={() => handleSnoozeReminder(reminder.id, 60)}>
                            Snooze 1h
                          </button>
                          <button className="action-button-secondary" onClick={() => handleSnoozeReminder(reminder.id, 1440)}>
                            Snooze 1d
                          </button>
                          <button className="action-button-ghost" onClick={() => handleDismissReminder(reminder.id)}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {upcomingReminders.length > 0 ? (
                <>
                  <div className="eyebrow mt-16">Upcoming reminders</div>
                  <div className="stack-list mt-8">
                    {upcomingReminders.map((reminder) => (
                      <div className="stack-card" key={reminder.id}>
                        <div className="stack-card-header">
                          <div className="flex-1">
                            <strong>{reminder.eventTitle}</strong>
                            <div className="muted">
                              Due {formatReminderDueLabel(reminder.dueAtUtc)} · {reminder.minutesBefore} min before event
                            </div>
                          </div>
                          <span className="pill">{formatReminderTriageState(reminder.dueAtUtc)}</span>
                        </div>
                        <div className="action-row compact-action-row">
                          <button className="action-button-secondary" onClick={() => handleSnoozeReminder(reminder.id, 60)}>
                            Snooze 1h
                          </button>
                          <button className="action-button-secondary" onClick={() => handleSnoozeReminder(reminder.id, 1440)}>
                            Snooze 1d
                          </button>
                          <button className="action-button-ghost" onClick={() => handleDismissReminder(reminder.id)}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </article>
          </section>
        </>
      ) : null}

      {data.recentActivity.length > 0 ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <div className="eyebrow">Household</div>
              <h2>What changed recently</h2>
              <div className="stack-list mt-12">
                {data.recentActivity.map((item, index) => (
                  <div className="stack-card" key={`${item.kind}-${item.occurredAtUtc}-${index}`}>
                    <div className="stack-card-header">
                      <div className="flex-1">
                        <strong>{item.title}</strong>
                        {item.detail ? <div className="muted">{item.detail}</div> : null}
                        <div className="muted">
                          {item.kind === "ChoreCompletion"
                            ? `Completed by ${item.actorDisplayName}`
                            : item.kind === "NoteCreated"
                              ? `Note added by ${item.actorDisplayName}`
                              : "Reminder fired"}
                        </div>
                      </div>
                      <span className="pill text-xs">{formatRelativeTime(item.occurredAtUtc)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      {error ? (
        <>
          <div className="section-spacer" />
          <section className="grid">
            <article className="panel">
              <p className="error-text" role="alert">{error}</p>
            </article>
          </section>
        </>
      ) : null}
    </>
  );
}
