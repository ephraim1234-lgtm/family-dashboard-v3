"use client";

import {
  ActionButton,
  Badge,
  Card,
  EmptyState,
  ListCard,
  QuickActions,
  SectionHeader,
  StatCard
} from "@/components/ui";
import { useOverviewContext } from "./overview-context";

export function AgendaPanel() {
  const {
    data,
    isPending,
    showEventForm,
    setShowEventForm,
    showReminderForm,
    setShowReminderForm,
    eventTitle,
    setEventTitle,
    eventDesc,
    setEventDesc,
    eventAllDay,
    setEventAllDay,
    eventAllDayDate,
    setEventAllDayDate,
    eventStart,
    setEventStart,
    eventEnd,
    setEventEnd,
    eventValidationIssues,
    resetEventDraft,
    reminderEventId,
    setReminderEventId,
    reminderMinutes,
    setReminderMinutes,
    handleAddEvent,
    handleAddReminder,
    formatDayLabel,
    formatWeekdayShort,
    formatTime,
    applySuggestedEnd
  } = useOverviewContext();

  if (!data) {
    return null;
  }

  const timedUpcoming = data.upcomingDays
    .flatMap((day) => day.events)
    .filter((event) => !event.isAllDay && event.startsAtUtc);

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Schedule"
            title="Coming up"
            description="The next seven days stay grouped in one calm view so the household can scan what is ahead."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Next 7 days" value={data.upcomingEventCount} />
            <StatCard label="Planned days" value={data.upcomingDays.length} />
            <StatCard label="Timed events" value={timedUpcoming.length} />
          </div>

          {data.upcomingDays.length === 0 ? (
            <EmptyState message="Nothing is scheduled for the next week yet." />
          ) : (
            <>
              <div className="home-week-glance">
                {data.upcomingDays.map((day) => (
                  <div className="home-week-day" key={day.date}>
                    <div className="home-week-day-label">{formatWeekdayShort(day.date)}</div>
                    <div className="home-week-day-count">{day.events.length}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4">
                {data.upcomingDays.map((day) => (
                  <Card className="space-y-3 p-4" key={day.date}>
                    <SectionHeader
                      eyebrow="Day view"
                      title={formatDayLabel(day.date)}
                      titleAs="h3"
                      actions={<Badge>{day.events.length} planned</Badge>}
                    />
                    <div className="grid gap-3">
                      {day.events.map((event, index) => (
                        <ListCard
                          key={`${day.date}-${index}`}
                          title={event.title}
                          description={!event.isAllDay && event.startsAtUtc
                            ? `${formatTime(event.startsAtUtc)}${event.endsAtUtc ? ` - ${formatTime(event.endsAtUtc)}` : ""}`
                            : "All day"}
                          action={event.isImported ? <Badge>Synced</Badge> : null}
                        />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Quick actions"
            title="Add an event or reminder"
            description="Keep event capture simple from the home view without changing the current forms or event behavior."
          />

          {!showEventForm && !showReminderForm ? (
            <QuickActions label="Start with">
              <ActionButton
                variant="ghost"
                onClick={() => {
                  resetEventDraft();
                  setShowEventForm(true);
                }}
              >
                Add event
              </ActionButton>
              <ActionButton variant="ghost" onClick={() => setShowReminderForm(true)}>
                Add reminder
              </ActionButton>
            </QuickActions>
          ) : null}

          {showEventForm ? (
            <div className="grid gap-4">
              <ListCard title="New household event" description="Add a one-time event with the same schedule logic already used in the workspace.">
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-[color:var(--text-strong)]">Event title *</span>
                    <input
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                      placeholder="Event title"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-[color:var(--text-strong)]">Description</span>
                    <input
                      value={eventDesc}
                      onChange={(event) => setEventDesc(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[color:var(--text)]">
                    <input
                      type="checkbox"
                      checked={eventAllDay}
                      onChange={(event) => {
                        const nextIsAllDay = event.target.checked;
                        setEventAllDay(nextIsAllDay);
                        if (nextIsAllDay) {
                          setEventEnd("");
                        } else if (!eventEnd && eventStart) {
                          setEventEnd(applySuggestedEnd(eventStart, 60));
                        }
                      }}
                    />
                    All day
                  </label>

                  {eventAllDay ? (
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[color:var(--text-strong)]">Date</span>
                      <input
                        type="date"
                        value={eventAllDayDate}
                        onChange={(event) => setEventAllDayDate(event.target.value)}
                      />
                    </label>
                  ) : (
                    <>
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-[color:var(--text-strong)]">Starts</span>
                        <input
                          type="datetime-local"
                          value={eventStart}
                          onChange={(event) => setEventStart(event.target.value)}
                        />
                      </label>
                      <QuickActions label="Helpful end times">
                        <ActionButton size="sm" variant="ghost" onClick={() => setEventEnd(applySuggestedEnd(eventStart, 30))} disabled={isPending || !eventStart}>
                          End +30m
                        </ActionButton>
                        <ActionButton size="sm" variant="ghost" onClick={() => setEventEnd(applySuggestedEnd(eventStart, 60))} disabled={isPending || !eventStart}>
                          End +1h
                        </ActionButton>
                        <ActionButton size="sm" variant="ghost" onClick={() => setEventEnd(applySuggestedEnd(eventStart, 120))} disabled={isPending || !eventStart}>
                          End +2h
                        </ActionButton>
                      </QuickActions>
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-[color:var(--text-strong)]">Ends</span>
                        <input
                          type="datetime-local"
                          value={eventEnd}
                          onChange={(event) => setEventEnd(event.target.value)}
                        />
                      </label>
                    </>
                  )}

                  <p className="ui-text-muted text-sm">
                    {eventAllDay
                      ? "All-day events use the selected local date and store it in UTC."
                      : "Times use your current browser locale and are stored in UTC."}
                  </p>

                  {eventValidationIssues.length > 0 ? (
                    <div className="grid gap-2" aria-live="polite">
                      {eventValidationIssues.map((issue) => (
                        <div className="error-text mt-0" key={issue}>{issue}</div>
                      ))}
                    </div>
                  ) : null}

                  <QuickActions label="Save or cancel">
                    <ActionButton onClick={handleAddEvent} disabled={isPending || eventValidationIssues.length > 0}>
                      Add event
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      onClick={() => {
                        setShowEventForm(false);
                        resetEventDraft();
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </ActionButton>
                  </QuickActions>
                </div>
              </ListCard>
            </div>
          ) : null}

          {showReminderForm ? (
            <ListCard title="New reminder" description="Attach a reminder to one of the upcoming timed events already visible in the household agenda.">
              {timedUpcoming.length === 0 ? (
                <EmptyState message="No upcoming timed events are available for reminders yet." />
              ) : (
                <div className="grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-[color:var(--text-strong)]">Event *</span>
                    <select
                      value={reminderEventId}
                      onChange={(event) => setReminderEventId(event.target.value)}
                    >
                      <option value="">Select an event...</option>
                      {timedUpcoming.map((event) => (
                        <option key={event.scheduledEventId} value={event.scheduledEventId}>
                          {event.title} - {formatTime(event.startsAtUtc)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-[color:var(--text-strong)]">Minutes before *</span>
                    <input
                      type="number"
                      min={1}
                      max={10080}
                      value={reminderMinutes}
                      onChange={(event) => setReminderMinutes(event.target.value)}
                    />
                  </label>
                  <QuickActions label="Save or cancel">
                    <ActionButton onClick={handleAddReminder} disabled={isPending || !reminderEventId}>
                      Schedule reminder
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      onClick={() => {
                        setShowReminderForm(false);
                        setReminderEventId("");
                        setReminderMinutes("30");
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </ActionButton>
                  </QuickActions>
                </div>
              )}
            </ListCard>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
