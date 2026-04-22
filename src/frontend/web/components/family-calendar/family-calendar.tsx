"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
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
import { formatReminderTriageState } from "@/lib/family-command-center";
import {
  type CalendarDayEntry,
  type CalendarDayGroup,
  type CalendarMonthDay
} from "@/lib/family-calendar";

function useIsMobileCalendarLayout() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(max-width: 760px)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updateMatch = () => setIsMobile(mediaQuery.matches);

    updateMatch();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMatch);
      return () => mediaQuery.removeEventListener("change", updateMatch);
    }

    mediaQuery.addListener(updateMatch);
    return () => mediaQuery.removeListener(updateMatch);
  }, []);

  return isMobile;
}

function CalendarEntryButton({
  item
}: {
  item: CalendarDayEntry;
}) {
  const { setSelectedDetail } = useFamilyCalendarContext();

  return (
    <button
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
      {item.kind === "event" && item.spanLabel ? (
        <div className="pill family-calendar-span-pill">{item.spanLabel}</div>
      ) : null}
      <HouseholdMetaBadges
        owner={item.ownerDisplay}
        kind={item.kind}
        sourceLabel={item.sourceLabel}
        urgencyState={item.urgencyState}
        accessLabel={item.accessState === "editable" ? "Editable" : "Read only"}
      />
    </button>
  );
}

function CalendarItemList({
  items,
  emptyMessage
}: {
  items: CalendarDayEntry[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="muted mb-0">{emptyMessage}</p>;
  }

  return (
    <div className="family-calendar-item-list">
      {items.map((item) => (
        <CalendarEntryButton key={item.key} item={item} />
      ))}
    </div>
  );
}

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
  return (
    <div className={`family-calendar-day-card${isToday ? " family-calendar-day-card-today" : ""}`} key={date}>
      <div className="family-calendar-day-head">
        <div>
          <div className="eyebrow">{shortLabel}</div>
          <h3 className="family-calendar-day-title">{label}</h3>
        </div>
        <div className="family-calendar-day-summary">
          <span className="pill">{busyLabel}</span>
          {(eventCount > 0 || reminderCount > 0) ? (
            <span className="pill">{eventCount} events, {reminderCount} prompts</span>
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
            <CalendarEntryButton key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickCreateSection({
  title,
  description,
  resetForSelectedDate = false,
  testId
}: {
  title: string;
  description: string;
  resetForSelectedDate?: boolean;
  testId?: string;
}) {
  const {
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
    resetEventDraft,
    resetEventDraftForSelectedDate
  } = useFamilyCalendarContext();

  return (
    <HouseholdSection
      eyebrow="Quick create"
      title={title}
      description={description}
      data-testid={testId}
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
          <ActionButton
            variant="ghost"
            onClick={resetForSelectedDate ? resetEventDraftForSelectedDate : resetEventDraft}
            disabled={isPending}
          >
            Reset
          </ActionButton>
        </div>
      </div>
    </HouseholdSection>
  );
}

function TodaySummarySection() {
  const { viewModel } = useFamilyCalendarContext();

  if (!viewModel) {
    return null;
  }

  return (
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
  );
}

function BoardContextSection() {
  const { homeData } = useFamilyCalendarContext();

  return (
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
  );
}

function ContextRail() {
  return (
    <div className="family-calendar-rail">
      <TodaySummarySection />
      <QuickCreateSection
        title="Add a local event"
        description="Members can capture a new household block without leaving the planning surface."
      />
      <BoardContextSection />
    </div>
  );
}

function MonthDayButton({
  day,
  compact
}: {
  day: CalendarMonthDay;
  compact: boolean;
}) {
  const { selectDate } = useFamilyCalendarContext();
  const itemCount = day.eventCount + day.reminderCount;

  return (
    <button
      aria-label={`${day.date}: ${day.eventCount} events and ${day.reminderCount} prompts`}
      className={[
        "family-calendar-month-day",
        compact ? "family-calendar-month-day-compact" : null,
        day.isCurrentMonth ? null : "family-calendar-month-day-muted",
        day.isToday ? "family-calendar-month-day-today" : null,
        day.isSelected ? "family-calendar-month-day-selected" : null
      ].filter(Boolean).join(" ")}
      data-testid={`calendar-month-day-${day.date}`}
      onClick={() => selectDate(day.date)}
      type="button"
    >
      <span className="family-calendar-month-day-number">{day.dayNumber}</span>
      <span className="family-calendar-month-body" aria-hidden="true">
        {day.eventTiles.length > 0 ? (
          <span className="family-calendar-month-tile-stack">
            {day.eventTiles.map((tile) => (
              <span
                className={[
                  "family-calendar-month-tile",
                  `family-calendar-month-tile-${tile.tone}`,
                  tile.isStart ? "family-calendar-month-tile-start" : "family-calendar-month-tile-continue",
                  tile.isEnd ? "family-calendar-month-tile-end" : "family-calendar-month-tile-continue"
                ].join(" ")}
                key={tile.key}
                title={tile.title}
              />
            ))}
          </span>
        ) : (
          <span className="family-calendar-month-tile-stack family-calendar-month-tile-stack-empty" />
        )}
        {itemCount > 0 ? (
          <span className="family-calendar-month-indicators">
            {Array.from({ length: Math.min(day.reminderDotCount, 2) }, (_, index) => (
              <span
                className="family-calendar-month-indicator family-calendar-month-indicator-reminder"
                key={`${day.date}-reminder-${index}`}
              />
            ))}
            {day.eventTiles.length === 0
              ? day.indicatorTones
                .filter((tone) => tone !== "reminder")
                .slice(0, 2)
                .map((tone, index) => (
                  <span
                    className={`family-calendar-month-indicator family-calendar-month-indicator-${tone}`}
                    key={`${day.date}-${tone}-${index}`}
                  />
                ))
              : null}
            {day.overflowCount > 0 ? (
              <span className="family-calendar-month-overflow">+{day.overflowCount}</span>
            ) : null}
          </span>
        ) : (
          <span className="family-calendar-month-indicators family-calendar-month-indicators-empty" />
        )}
      </span>
    </button>
  );
}

function MonthPlannerSection({
  compact,
  onCreateFromSelectedDay,
  testId,
  enableSwipe = false
}: {
  compact: boolean;
  onCreateFromSelectedDay: () => void;
  testId: string;
  enableSwipe?: boolean;
}) {
  const {
    viewModel,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth
  } = useFamilyCalendarContext();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (!viewModel) {
    return null;
  }

  const { mobileMonth } = viewModel;
  const selectedDay = mobileMonth.selectedDay;

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!enableSwipe) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!enableSwipe || !touchStartRef.current) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      touchStartRef.current = null;
      return;
    }

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      goToNextMonth();
      return;
    }

    goToPreviousMonth();
  }

  return (
    <HouseholdSection
      eyebrow="Planning"
      title="Family calendar"
      description={
        compact
          ? "A compact month planner for daily household browsing on mobile."
          : "Month-at-a-glance planning that still keeps the selected day readable and actionable."
      }
      actions={(
        <div className="family-calendar-toolbar">
          <ActionButton variant="ghost" size="sm" onClick={goToPreviousMonth}>
            Previous month
          </ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={goToCurrentMonth}>
            This month
          </ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={goToNextMonth}>
            Next month
          </ActionButton>
        </div>
      )}
      data-testid={testId}
    >
      <div className="family-calendar-month-header">
        <h2 className="family-calendar-range" data-testid="calendar-month-label">
          {mobileMonth.monthLabel}
        </h2>
        <div className="family-calendar-day-summary">
          <span className="pill">{selectedDay.eventCount} events</span>
          <span className="pill">{selectedDay.reminderCount} prompts</span>
        </div>
      </div>

      <div className="family-calendar-month-weekdays">
        {mobileMonth.weekdayHeaders.map((weekday) => (
          <span className="family-calendar-month-weekday" key={weekday}>
            {weekday}
          </span>
        ))}
      </div>

      <div
        className={`family-calendar-month-grid${compact ? "" : " family-calendar-month-grid-desktop"}`}
        data-testid="calendar-month-grid"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {mobileMonth.days.map((day) => (
          <MonthDayButton key={day.date} day={day} compact={compact} />
        ))}
      </div>

      <div className="family-calendar-selected-day-card" data-testid="calendar-selected-day">
        <div className="family-calendar-selected-day-head">
          <div>
            <div className="eyebrow">Selected day</div>
            <h3 className="family-calendar-day-title">{selectedDay.fullLabel}</h3>
            <p className="muted mb-0">{selectedDay.busyLabel}</p>
          </div>
          <ActionButton
            onClick={onCreateFromSelectedDay}
            size="sm"
            data-testid="calendar-selected-day-add"
          >
            Add event on {selectedDay.createLabel}
          </ActionButton>
        </div>
        <CalendarItemList
          items={selectedDay.items}
          emptyMessage="Nothing is scheduled or prompted on this day."
        />
      </div>
    </HouseholdSection>
  );
}

function DesktopMonthPlannerSection({
  onCreateFromSelectedDay
}: {
  onCreateFromSelectedDay: () => void;
}) {
  return (
    <div className="family-calendar-desktop-month" data-testid="family-calendar-desktop-month">
      <MonthPlannerSection
        compact={false}
        onCreateFromSelectedDay={onCreateFromSelectedDay}
        testId="family-calendar-desktop-month-shell"
      />
    </div>
  );
}

function WeekPlanningSection({
  onCreateFromSelectedDay
}: {
  onCreateFromSelectedDay: () => void;
}) {
  const {
    viewModel,
    viewMode,
    setViewMode,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    goToCurrentMonth
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
          <ActionButton variant="ghost" size="sm" onClick={goToCurrentMonth}>
            This month
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
            { label: "Agenda", value: "agenda" },
            { label: "Month", value: "month" }
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
      ) : viewMode === "agenda" ? (
        <div className="family-calendar-agenda" data-testid="family-calendar-agenda-view">
          {viewModel.days.map((day) => (
            <div className="stack-card" key={day.date}>
              <div className="stack-card-header">
                <div>
                  <strong>{day.label}</strong>
                  <div className="muted">{day.busyLabel}</div>
                </div>
                <span className="pill">{day.eventCount} events, {day.reminderCount} prompts</span>
              </div>
              <CalendarItemList
                items={day.items}
                emptyMessage="Nothing is scheduled or prompted on this day."
              />
            </div>
          ))}
        </div>
      ) : (
        <DesktopMonthPlannerSection onCreateFromSelectedDay={onCreateFromSelectedDay} />
      )}
    </HouseholdSection>
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
          {isEvent && selectedDetail.item.spanLabel ? (
            <p className="muted mb-0">{selectedDetail.item.spanLabel}</p>
          ) : null}
          {isEvent && selectedDetail.item.recurrenceSummary ? (
            <p className="muted mb-0 mt-3">{selectedDetail.item.recurrenceSummary}</p>
          ) : null}
          {isEvent && selectedDetail.item.googleSyncLabel ? (
            <p className="muted mb-0 mt-3">{selectedDetail.item.googleSyncLabel}</p>
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

        {selectedDetail.type === "event" && !selectedDetail.item.isImported && selectedDetail.item.isGoogleMirrorEnabled ? (
          <div className="stack-card">
            <div className="eyebrow">Google mirror</div>
            <p className="muted">
              {selectedDetail.item.googleSyncLabel ?? "Mirrored to Google"}
              {selectedDetail.item.googleTargetDisplayName
                ? ` - ${selectedDetail.item.googleTargetDisplayName}`
                : ""}
            </p>
            {selectedDetail.item.googleSyncError ? (
              <p className="error-text">{selectedDetail.item.googleSyncError}</p>
            ) : null}
            {selectedDetail.item.lastGoogleSyncSucceededAtUtc ? (
              <p className="muted mb-0">
                Last synced {new Date(selectedDetail.item.lastGoogleSyncSucceededAtUtc).toLocaleString()}.
              </p>
            ) : (
              <p className="muted mb-0">
                This local event is queued through the Google sync worker rather than writing directly from the calendar form.
              </p>
            )}
          </div>
        ) : null}

        {selectedDetail.type === "reminder" ? (
          <div className="stack-card">
            <div className="eyebrow">Reminder</div>
            <p className="muted">
              {selectedDetail.item.status} - {selectedDetail.item.minutesBefore} minutes before the related event.
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
  const {
    isLoading,
    error,
    successMessage,
    isAuthenticated,
    viewModel,
    prefillEventDraftForSelectedDate
  } = useFamilyCalendarContext();
  const isMobileCalendarLayout = useIsMobileCalendarLayout();
  const mobileQuickCreateRef = useRef<HTMLDivElement | null>(null);
  const desktopQuickCreateRef = useRef<HTMLDivElement | null>(null);

  function handleCreateFromSelectedDay() {
    prefillEventDraftForSelectedDate();
    const target = isMobileCalendarLayout
      ? mobileQuickCreateRef.current
      : desktopQuickCreateRef.current;

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <PageContainer className="family-calendar-page">
      {error ? <StatusMessage message={error} variant="danger" /> : null}
      {successMessage ? <StatusMessage message={successMessage} variant="success" /> : null}

      <PageHeader
        eyebrow="Calendar"
        title="Calendar"
        description="A warm family planner that stays week-first on larger screens, becomes month-first on mobile, and now supports a shared month view on desktop too."
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
        isMobileCalendarLayout ? (
          <div className="family-calendar-mobile-stack" data-testid="family-calendar-page">
            <MonthPlannerSection
              compact
              enableSwipe
              onCreateFromSelectedDay={handleCreateFromSelectedDay}
              testId="family-calendar-mobile-month"
            />
            <div ref={mobileQuickCreateRef}>
              <QuickCreateSection
                title={`Add an event on ${viewModel.mobileMonth.selectedDay.createLabel}`}
                description="Use the selected day as the default date, then create through the same local event flow."
                resetForSelectedDate
                testId="calendar-mobile-quick-create"
              />
            </div>
            <TodaySummarySection />
            <BoardContextSection />
            <CalendarDetailDrawer />
          </div>
        ) : (
          <div className="family-calendar-layout" data-testid="family-calendar-page">
            <WeekPlanningSection onCreateFromSelectedDay={handleCreateFromSelectedDay} />
            <div ref={desktopQuickCreateRef}>
              <ContextRail />
            </div>
            <CalendarDetailDrawer />
          </div>
        )
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
