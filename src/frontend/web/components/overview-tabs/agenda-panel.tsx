"use client";

import { EmptyState } from "@/components/ui";
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
    <>
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Schedule</div>
          <h2>Coming up</h2>
          <p className="muted mt-8">
            {data.upcomingEventCount} event
            {data.upcomingEventCount !== 1 ? "s" : ""} in the next 7 days
          </p>

          {data.upcomingDays.length === 0 ? (
            <EmptyState className="mt-12" message="Nothing is scheduled for the next week yet." />
          ) : (
            <>
              <div className="home-week-glance mt-14">
                {data.upcomingDays.map((day) => (
                  <div className="home-week-day" key={day.date}>
                    <div className="home-week-day-label">{formatWeekdayShort(day.date)}</div>
                    <div className="home-week-day-count">{day.events.length}</div>
                  </div>
                ))}
              </div>

              <div className="day-group-list mt-16">
                {data.upcomingDays.map((day) => (
                  <div className="day-group" key={day.date}>
                    <div className="day-group-heading">{formatDayLabel(day.date)}</div>
                    <div className="stack-list">
                      {day.events.map((event, index) => (
                        <div className="stack-card" key={`${day.date}-${index}`}>
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
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <div className="section-spacer" />
      <section className="grid">
        <article className="panel">
          <div className="eyebrow">Quick actions</div>
          <h2>Add an event or reminder</h2>

          {showEventForm ? (
            <div className="stack-list mt-12">
              <div className="stack-card">
                <div className="form-row">
                  <label className="form-label">Event title *</label>
                  <input
                    className="form-input"
                    value={eventTitle}
                    onChange={(event) => setEventTitle(event.target.value)}
                    placeholder="Event title"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Description</label>
                  <input
                    className="form-input"
                    value={eventDesc}
                    onChange={(event) => setEventDesc(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">
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
                    {" "}All day
                  </label>
                </div>

                {eventAllDay ? (
                  <div className="form-row">
                    <label className="form-label">Date</label>
                    <input
                      className="form-input"
                      type="date"
                      value={eventAllDayDate}
                      onChange={(event) => setEventAllDayDate(event.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-row">
                      <label className="form-label">Starts</label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={eventStart}
                        onChange={(event) => setEventStart(event.target.value)}
                      />
                    </div>
                    <div className="pill-row scheduling-helper-row">
                      <button className="pill-button" type="button" onClick={() => setEventEnd(applySuggestedEnd(eventStart, 30))} disabled={isPending || !eventStart}>
                        End +30m
                      </button>
                      <button className="pill-button" type="button" onClick={() => setEventEnd(applySuggestedEnd(eventStart, 60))} disabled={isPending || !eventStart}>
                        End +1h
                      </button>
                      <button className="pill-button" type="button" onClick={() => setEventEnd(applySuggestedEnd(eventStart, 120))} disabled={isPending || !eventStart}>
                        End +2h
                      </button>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Ends</label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={eventEnd}
                        onChange={(event) => setEventEnd(event.target.value)}
                      />
                    </div>
                  </>
                )}

                <p className="muted mt-8">
                  {eventAllDay
                    ? "All-day events use the selected local date and store it in UTC."
                    : "Times use your current browser locale and are stored in UTC."}
                </p>

                {eventValidationIssues.length > 0 ? (
                  <div className="scheduling-validation-list" aria-live="polite">
                    {eventValidationIssues.map((issue) => (
                      <div className="error-text" key={issue}>{issue}</div>
                    ))}
                  </div>
                ) : null}

                <div className="pill-row mt-8">
                  <button
                    className="action-button"
                    onClick={handleAddEvent}
                    disabled={isPending || eventValidationIssues.length > 0}
                  >
                    Add event
                  </button>
                  <button
                    className="action-button-secondary"
                    onClick={() => {
                      setShowEventForm(false);
                      resetEventDraft();
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {showReminderForm ? (
            <div className="stack-list mt-12">
              <div className="stack-card">
                {timedUpcoming.length === 0 ? (
                  <p className="muted">No upcoming timed events to attach a reminder to.</p>
                ) : (
                  <>
                    <div className="form-row">
                      <label className="form-label">Event *</label>
                      <select
                        className="form-input"
                        value={reminderEventId}
                        onChange={(event) => setReminderEventId(event.target.value)}
                      >
                        <option value="">Select an event…</option>
                        {timedUpcoming.map((event) => (
                          <option key={event.scheduledEventId} value={event.scheduledEventId}>
                            {event.title} - {formatTime(event.startsAtUtc)}
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
                        onChange={(event) => setReminderMinutes(event.target.value)}
                      />
                    </div>
                    <div className="pill-row mt-8">
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
                )}
              </div>
            </div>
          ) : null}

          {!showEventForm && !showReminderForm ? (
            <div className="action-row">
              <button
                className="action-button-secondary"
                onClick={() => {
                  resetEventDraft();
                  setShowEventForm(true);
                }}
              >
                + Event
              </button>
              <button className="action-button-secondary" onClick={() => setShowReminderForm(true)}>
                + Reminder
              </button>
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
}
