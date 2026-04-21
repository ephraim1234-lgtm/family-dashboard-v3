"use client";

import { applySuggestedEnd } from "../member-event-draft";
import { HouseholdBoardCard, HouseholdEmptyState, HouseholdMetaBadges, HouseholdSection } from "../household";
import { FamilyCalendarProvider, useFamilyCalendarContext } from "./family-calendar-context";
import { SchedulingReminderManager, SchedulingSeriesEditor } from "../scheduling";
import {
  ActionButton,
  BottomDrawer,
  Card,
  EmptyState,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  SegmentedToggle,
  StatusMessage
} from "@/components/ui";
import { type CalendarDayGroup } from "@/lib/family-calendar";
import { formatReminderTriageState } from "@/lib/family-command-center";

function CalendarDayCard({
  date,
  label,
  shortLabel,
  isToday,
  items,
  busyLabel,
  eventCount,
  reminderCount
}: CalendarDayGroup) {
  const { setSelectedDetail } = useFamilyCalendarContext();

  return (
    <div className={`family-calendar-day-card${isToday ? " family-calendar-day-card-today" : ""}`}>
      <div className="family-calendar-day-head">
        <div>
          <div className="eyebrow">{shortLabel}</div>
          <h3 className="family-calendar-day-title">{label}</h3>
        </div>
        <div className="family-calendar-day-summary">
          <span className="pill">{busyLabel}</span>
          {(eventCount > 0 || reminderCount > 0) ? (
            <span className="pill">{eventCount} events · {reminderCount} prompts</span>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="family-calendar-empty">
          <HouseholdEmptyState variant="nothing-upcoming" />
        </div>
      ) : (
        <div className="family-calendar-item-list">
          {items.map((item) => (
            <button
              key={item.key}
              className={`family-calendar-item-card family-calendar-item-card-${item.kind}`}
              data-testid={`calendar-entry-${item.kind}-${item.id}`}
              onClick={() => setSelectedDetail(
                item.kind === "event"
                  ? { type: "event", item }
                  : { type: "reminder", item }
              )}
              type="button"
            >
              <div className="family-calendar-item-head">
                <div className="min-w-0 flex-1">
                  <strong>{item.title}</strong>
                  <div className="muted">
                    {item.kind === "event" ? item.timeLabel : item.dueLabel}
                  </div>
                </div>
                <span className="pill">
                  {item.kind === "event" ? item.timeLabel : item.status}
                </span>
              </div>
              <div className="muted">{item.detailLabel}</div>
              <HouseholdMetaBadges
                owner={item.ownerDisplay}
                kind={item.kind}
                sourceLabel={item.sourceLabel}
                urgencyState={item.urgencyState}
                accessLabel={item.accessState === "editable" ? "Editable" : "Read only"}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekPlanningSection() {
  const {
    viewModel,
    viewMode,
    setViewMode,
    setSelectedDetail,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek
  } = useFamilyCalendarContext();

  if (!viewModel) {
    return null;
  }

  return (
    <HouseholdSection
      eyebrow="Planning"
      title="Family calendar"
      description="Week-first household planning with clear local, imported, and reminder distinctions."
      actions={(
        <div className="family-calendar-toolbar">
          <ActionButton variant="ghost" size="sm" onClick={goToPreviousWeek}>
            Previous week
          </ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={goToCurrentWeek}>
            This week
          </ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={goToNextWeek}>
            Next week
          </ActionButton>
        </div>
      )}
      data-testid="family-calendar-section"
    >
      <div className="family-calendar-summary-row">
        <div>
          <h2 className="family-calendar-range">{viewModel.weekRangeLabel}</h2>
          <p className="muted mb-0">
            {viewModel.totalEvents} scheduled blocks, {viewModel.importedCount} imported, {viewModel.reminderCount} prompts
          </p>
        </div>
        <SegmentedToggle
          value={viewMode}
          options={[
            { label: "Week", value: "week" },
            { label: "Agenda", value: "agenda" }
          ]}
          onChange={setViewMode}
          testId="calendar-view-toggle"
        />
      </div>

      {viewMode === "week" ? (
        <div className="family-calendar-grid" data-testid="family-calendar-week-grid">
          {viewModel.days.map((day) => (
            <CalendarDayCard key={day.date} {...day} />
          ))}
        </div>
      ) : (
        <div className="family-calendar-agenda" data-testid="family-calendar-agenda-view">
          {viewModel.days.map((day) => (
            <div className="stack-card" key={day.date}>
              <div className="stack-card-header">
                <div>
                  <strong>{day.label}</strong>
                  <div className="muted">{day.busyLabel}</div>
                </div>
                <span className="pill">{day.eventCount} events · {day.reminderCount} prompts</span>
              </div>
              {day.items.length === 0 ? (
                <p className="muted mb-0">Nothing is scheduled or prompted on this day.</p>
              ) : (
                <div className="family-calendar-item-list">
                  {day.items.map((item) => (
                    <button
                      key={item.key}
                      className={`family-calendar-item-card family-calendar-item-card-${item.kind}`}
                      data-testid={`calendar-entry-${item.kind}-${item.id}`}
                      onClick={() => setSelectedDetail(
                        item.kind === "event"
                          ? { type: "event", item }
                          : { type: "reminder", item }
                      )}
                      type="button"
                    >
                      <div className="family-calendar-item-head">
                        <div className="min-w-0 flex-1">
                          <strong>{item.title}</strong>
                          <div className="muted">
                            {item.kind === "event" ? item.timeLabel : item.dueLabel}
                          </div>
                        </div>
                        <span className="pill">
                          {item.kind === "event" ? item.timeLabel : item.status}
                        </span>
                      </div>
                      <HouseholdMetaBadges
                        owner={item.ownerDisplay}
                        kind={item.kind}
                        sourceLabel={item.sourceLabel}
                        urgencyState={item.urgencyState}
                        accessLabel={item.accessState === "editable" ? "Editable" : "Read only"}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </HouseholdSection>
  );
}

function ContextRail() {
  const {
    viewModel,
    homeData,
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
    handleAddEvent,
    isPending,
    resetEventDraft
  } = useFamilyCalendarContext();

  if (!viewModel) {
    return null;
  }

  return (
    <div className="family-calendar-rail">
      <HouseholdSection
        eyebrow="Today"
        title={viewModel.focusSummary.todayLabel}
        description="A compact planning rail so Calendar still feels connected to the command center."
      >
        <div className="family-calendar-today-card">
          <span className="pill">{viewModel.focusSummary.todayEventCount} events</span>
          <span className="pill">{viewModel.focusSummary.todayReminderCount} prompts</span>
          <span className="pill">{viewModel.focusSummary.noteCount} notes</span>
        </div>
        {viewModel.focusSummary.nextEvent ? (
          <HouseholdBoardCard
            tone="accent"
            title={viewModel.focusSummary.nextEvent.title}
            description={viewModel.focusSummary.nextEvent.timeLabel}
            meta={(
              <HouseholdMetaBadges
                kind={viewModel.focusSummary.nextEvent.kind}
                sourceLabel={viewModel.focusSummary.nextEvent.sourceLabel}
                accessLabel={viewModel.focusSummary.nextEvent.accessState === "editable" ? "Editable" : "Read only"}
              />
            )}
          />
        ) : (
          <HouseholdEmptyState variant="quiet-day" />
        )}
      </HouseholdSection>

      <HouseholdSection
        eyebrow="Quick create"
        title="Add a local event"
        description="Members can capture a new household block without leaving the planning surface."
      >
        <div className="family-calendar-quick-add">
          <input
            aria-label="Calendar event title"
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
            placeholder="Event title"
          />
          <input
            aria-label="Calendar event description"
            value={eventDesc}
            onChange={(event) => setEventDesc(event.target.value)}
            placeholder="Optional description"
          />
          <label className="family-checkbox-row">
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
            <span>All day</span>
          </label>
          {eventAllDay ? (
            <input
              aria-label="Calendar all day date"
              type="date"
              value={eventAllDayDate}
              onChange={(event) => setEventAllDayDate(event.target.value)}
            />
          ) : (
            <>
              <input
                aria-label="Calendar event starts"
                type="datetime-local"
                value={eventStart}
                onChange={(event) => setEventStart(event.target.value)}
              />
              <input
                aria-label="Calendar event ends"
                type="datetime-local"
                value={eventEnd}
                onChange={(event) => setEventEnd(event.target.value)}
              />
            </>
          )}
          {eventValidationIssues.length > 0 ? (
            <div className="scheduling-validation-list">
              {eventValidationIssues.map((issue) => (
                <div className="error-text" key={issue}>{issue}</div>
              ))}
            </div>
          ) : null}
          <div className="action-row compact-action-row">
            <ActionButton
              onClick={handleAddEvent}
              disabled={isPending || eventValidationIssues.length > 0}
            >
              Add event
            </ActionButton>
            <ActionButton variant="ghost" onClick={resetEventDraft} disabled={isPending}>
              Reset
            </ActionButton>
          </div>
        </div>
      </HouseholdSection>

      <HouseholdSection
        eyebrow="Household board"
        title="Pinned context"
        description="Lightweight notes and reminders stay nearby while planning."
      >
        {homeData?.pinnedNotes.length ? (
          homeData.pinnedNotes.slice(0, 2).map((note) => (
            <HouseholdBoardCard
              key={note.id}
              title={note.title}
              description={note.body}
              meta={<span className="pill">{note.authorDisplayName}</span>}
            />
          ))
        ) : (
          <HouseholdEmptyState variant="board-clear" />
        )}
        {homeData?.pendingReminders.slice(0, 2).map((reminder) => (
          <HouseholdBoardCard
            key={reminder.id}
            tone="warning"
            title={reminder.eventTitle}
            description={formatReminderTriageState(reminder.dueAtUtc)}
            meta={<span className="pill">{reminder.minutesBefore} min before</span>}
          />
        ))}
      </HouseholdSection>
    </div>
  );
}

function CalendarDetailDrawer() {
  const {
    selectedDetail,
    setSelectedDetail,
    isOwner,
    detailEditorOpen,
    setDetailEditorOpen,
    selectedSeriesItem,
    seriesEditorState,
    setSeriesEditorState,
    seriesValidationIssues,
    seriesEditorSummary,
    resetSeriesEditor,
    toggleSeriesWeeklyDay,
    matchSeriesStartDay,
    clearSeriesWeeklyDays,
    applySeriesSuggestedEnd,
    applySeriesSuggestedRecurrenceLength,
    handleSaveSeries,
    handleDeleteSeries,
    selectedEventReminders,
    reminderMinutesBefore,
    setReminderMinutesBefore,
    reminderError,
    handleAddReminder,
    handleDeleteReminder,
    handleDismissReminder,
    handleSnoozeReminder,
    isPending
  } = useFamilyCalendarContext();

  if (!selectedDetail) {
    return null;
  }

  const isEvent = selectedDetail.type === "event";
  const isEditableEvent = isEvent && selectedDetail.item.accessState === "editable" && isOwner;

  return (
    <BottomDrawer
      open={Boolean(selectedDetail)}
      onClose={() => setSelectedDetail(null)}
      title={selectedDetail.item.title}
      testId="calendar-detail-drawer"
    >
      <div className="family-calendar-drawer-stack">
        <div className="stack-card">
          <div className="stack-card-header">
            <div className="min-w-0 flex-1">
              <strong>{selectedDetail.item.title}</strong>
              <div className="muted">
                {isEvent ? selectedDetail.item.timeLabel : selectedDetail.item.dueLabel}
              </div>
            </div>
            <HouseholdMetaBadges
              owner={selectedDetail.item.ownerDisplay}
              kind={selectedDetail.item.kind}
              sourceLabel={selectedDetail.item.sourceLabel}
              urgencyState={selectedDetail.item.urgencyState}
              accessLabel={selectedDetail.item.accessState === "editable" ? "Editable" : "Read only"}
            />
          </div>
          {selectedDetail.item.description ? (
            <p className="muted">{selectedDetail.item.description}</p>
          ) : null}
          <p className="muted mb-0">{selectedDetail.item.detailLabel}</p>
          {isEvent && selectedDetail.item.recurrenceSummary ? (
            <p className="muted mb-0 mt-3">{selectedDetail.item.recurrenceSummary}</p>
          ) : null}
        </div>

        {isEditableEvent ? (
          detailEditorOpen ? (
            <div className="stack-card">
              <div className="eyebrow">Edit local series</div>
              <h3 className="m-0 text-xl font-semibold text-[color:var(--text-strong)]">
                Update the owning local event
              </h3>
              <p className="muted">
                Calendar edits apply to the whole local series. Imported events remain read-only.
              </p>
              <SchedulingSeriesEditor
                state={seriesEditorState}
                summary={seriesEditorSummary}
                validationIssues={seriesValidationIssues}
                isPending={isPending}
                onStateChange={setSeriesEditorState}
                onToggleWeeklyDay={toggleSeriesWeeklyDay}
                onMatchStartDay={matchSeriesStartDay}
                onClearWeeklyDays={clearSeriesWeeklyDays}
                onApplySuggestedEnd={applySeriesSuggestedEnd}
                onApplySuggestedRecurrenceLength={applySeriesSuggestedRecurrenceLength}
                onSubmit={handleSaveSeries}
                submitLabel="Save series"
                onCancel={() => {
                  setDetailEditorOpen(false);
                  resetSeriesEditor();
                }}
                cancelLabel="Close editor"
              >
                <SchedulingReminderManager
                  isAllDay={seriesEditorState.isAllDay}
                  isPending={isPending}
                  reminderMinutesBefore={reminderMinutesBefore}
                  onReminderMinutesChange={setReminderMinutesBefore}
                  onAddReminder={handleAddReminder}
                  reminders={selectedEventReminders}
                  reminderError={reminderError}
                  onDeleteReminder={handleDeleteReminder}
                />
              </SchedulingSeriesEditor>
              <div className="action-row compact-action-row">
                <ActionButton variant="danger" onClick={handleDeleteSeries} disabled={isPending}>
                  Delete series
                </ActionButton>
              </div>
            </div>
          ) : (
            <div className="stack-card">
              <div className="eyebrow">Local event</div>
              <p className="muted">
                This event is locally managed, so owners can edit the series and its reminders here.
              </p>
              <div className="action-row compact-action-row">
                <ActionButton onClick={() => setDetailEditorOpen(true)}>
                  Edit series
                </ActionButton>
                {selectedSeriesItem?.recurrenceSummary ? (
                  <span className="pill">{selectedSeriesItem.recurrenceSummary}</span>
                ) : null}
              </div>
            </div>
          )
        ) : null}

        {selectedDetail.type === "event" && selectedDetail.item.isImported ? (
          <div className="stack-card">
            <div className="eyebrow">Imported event</div>
            <p className="muted mb-0">
              Imported calendar items stay visible in the family calendar, but edits and deletes continue through the calendar integration workflow.
            </p>
          </div>
        ) : null}

        {selectedDetail.type === "reminder" ? (
          <div className="stack-card">
            <div className="eyebrow">Reminder</div>
            <p className="muted">
              {selectedDetail.item.status} · {selectedDetail.item.minutesBefore} minutes before the related event.
            </p>
            {isOwner ? (
              <div className="action-row compact-action-row">
                <ActionButton
                  variant="secondary"
                  onClick={() => handleSnoozeReminder(selectedDetail.item.id, 60)}
                  disabled={isPending}
                >
                  Snooze 1h
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => handleSnoozeReminder(selectedDetail.item.id, 1440)}
                  disabled={isPending}
                >
                  Snooze 1d
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  onClick={() => handleDismissReminder(selectedDetail.item.id)}
                  disabled={isPending}
                >
                  Dismiss
                </ActionButton>
                <ActionButton
                  variant="danger"
                  onClick={() => handleDeleteReminder(selectedDetail.item.id)}
                  disabled={isPending}
                >
                  Delete
                </ActionButton>
              </div>
            ) : (
              <p className="muted mb-0">
                Reminder triage stays owner-managed in this slice, but the prompt remains visible for household awareness.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </BottomDrawer>
  );
}

function FamilyCalendarBody() {
  const { isLoading, error, successMessage, isAuthenticated, viewModel } = useFamilyCalendarContext();

  return (
    <PageContainer className="family-calendar-page">
      {error ? <StatusMessage message={error} variant="danger" /> : null}
      {successMessage ? <StatusMessage message={successMessage} variant="success" /> : null}

      <PageHeader
        eyebrow="Calendar"
        title="Family planning surface"
        description="A warm, week-first schedule view that keeps local, imported, and reminder mental models clear."
      />

      {isLoading ? (
        <Card aria-busy="true">
          <LoadingSpinner label="Loading family calendar..." />
        </Card>
      ) : !isAuthenticated ? (
        <Card>
          <EmptyState message="Sign in to see your family calendar." />
        </Card>
      ) : viewModel ? (
        <div className="family-calendar-layout" data-testid="family-calendar-page">
          <WeekPlanningSection />
          <ContextRail />
          <CalendarDetailDrawer />
        </div>
      ) : (
        <Card>
          <EmptyState message="Calendar details are not available yet." />
        </Card>
      )}
    </PageContainer>
  );
}

export function FamilyCalendar() {
  return (
    <FamilyCalendarProvider>
      <FamilyCalendarBody />
    </FamilyCalendarProvider>
  );
}
