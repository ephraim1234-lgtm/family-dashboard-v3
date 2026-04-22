"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AuthStatusPanel } from "../auth-status-panel";
import { FoodSummaryPanel } from "../food-summary-panel";
import {
  HouseholdBoardCard,
  HouseholdEmptyState,
  HouseholdMetaBadges,
  HouseholdSection
} from "../household";
import {
  FamilyCommandCenterProvider,
  useFamilyCommandCenterContext
} from "./family-command-center-context";
import {
  ActionButton,
  Card,
  EmptyState,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  StatCard,
  StatusMessage
} from "@/components/ui";
import {
  formatDayLabel,
  formatRelativeTime,
  formatReminderDueLabel,
  formatReminderTriageState,
  formatTime,
  formatTimeRange
} from "@/lib/family-command-center";

function HeroSummaryStrip() {
  const { viewModel, data } = useFamilyCommandCenterContext();

  if (!viewModel || !data) {
    return null;
  }

  const happeningNowLabel = viewModel.hero.happeningNow.length > 0
    ? viewModel.hero.happeningNow.map((item) => item.title).join(" and ")
    : "Nothing is actively running right now";

  return (
    <Card className="family-hero-card" data-testid="family-command-hero">
      <div className="family-hero-kicker">
        <span>Family Command Center</span>
        <span>{data.todayEvents.length} events today</span>
        <span>{data.todayChores.length} chores on deck</span>
      </div>

      <div className="family-hero-grid">
        <div className="family-hero-primary">
          <div className="eyebrow">Happening now</div>
          <h2 className="family-hero-title">{happeningNowLabel}</h2>
          <p className="family-hero-copy">
            {viewModel.hero.happeningNow.length > 0
              ? "Use the top of the page to triage what is already in motion before you look further ahead."
              : "The household is between blocks, so the next few sections focus on what deserves attention next."}
          </p>
          {viewModel.hero.happeningNow.length > 0 ? (
            <div className="family-hero-chip-row">
              {viewModel.hero.happeningNow.map((item) => (
                <div className="family-hero-chip" key={item.key}>
                  <div className="font-semibold">{item.title}</div>
                  <div className="muted">{formatTimeRange(item)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="family-hero-secondary">
          <div className="eyebrow">Next up</div>
          {viewModel.hero.nextUp ? (
            <>
              <div className="family-next-time">{formatTime(viewModel.hero.nextUp.startsAtUtc)}</div>
              <div className="text-xl font-semibold text-[color:var(--text-strong)]">
                {viewModel.hero.nextUp.title}
              </div>
              <HouseholdMetaBadges
                kind={viewModel.hero.nextUp.kind}
                sourceLabel={viewModel.hero.nextUp.sourceLabel}
                urgencyState={viewModel.hero.nextUp.urgencyState}
              />
            </>
          ) : (
            <>
              <div className="family-next-time">Clear</div>
              <div className="text-xl font-semibold text-[color:var(--text-strong)]">
                No timed blocks are queued next
              </div>
              <p className="muted mb-0">
                The household has room to breathe beyond what is already happening now.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="family-summary-strip">
        {viewModel.hero.summaryCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>
    </Card>
  );
}

function TodayByMemberSection() {
  const {
    viewModel,
    members,
    isOwner,
    isPending,
    handleComplete,
    handleReassign
  } = useFamilyCommandCenterContext();

  if (!viewModel) {
    return null;
  }

  return (
    <HouseholdSection
      eyebrow="Today by member"
      title="Who owns what today"
      description="Slice 1 keeps this grounded in chore ownership and visible progress instead of guessing at event ownership."
      id="today-by-member"
      data-testid="today-by-member-section"
    >
      {viewModel.memberLanes.length === 0 ? (
        <HouseholdEmptyState variant="quiet-day" />
      ) : (
        <div className="family-lane-grid">
          {viewModel.memberLanes.map((lane) => (
            <div className="stack-card family-lane-card" key={lane.key}>
              <div className="stack-card-header">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-[color:var(--text-strong)]">
                    {lane.label}
                  </div>
                  <HouseholdMetaBadges owner={lane.ownerDisplay} />
                </div>
                <div className="family-lane-stats">
                  <span className="pill">{lane.openChores.length} open</span>
                  {lane.completedCount > 0 ? (
                    <span className="pill">{lane.completedCount} done</span>
                  ) : null}
                </div>
              </div>

              <div className="pill-row">
                {lane.currentStreakDays > 0 ? (
                  <span className="pill">{lane.currentStreakDays} day streak</span>
                ) : null}
                {lane.completionsThisWeek > 0 ? (
                  <span className="pill">{lane.completionsThisWeek} this week</span>
                ) : null}
              </div>

              {lane.openChores.length === 0 ? (
                <EmptyState
                  title="Nothing left here"
                  message="This lane is clear for the rest of today."
                />
              ) : (
                <div className="stack-list">
                  {lane.openChores.map((chore) => (
                    <div className="stack-card home-attention-card" key={chore.key}>
                      <div className="stack-card-header">
                        <div className="min-w-0 flex-1">
                          <strong>{chore.title}</strong>
                          <HouseholdMetaBadges
                            owner={chore.ownerDisplay}
                            kind={chore.kind}
                            urgencyState={chore.urgencyState}
                          />
                          {isOwner && members.length > 0 ? (
                            <div className="mt-3">
                              <select
                                value={chore.assignedMembershipId ?? ""}
                                onChange={(event) => handleReassign(
                                  chore.choreId,
                                  event.target.value === "" ? null : event.target.value
                                )}
                                disabled={isPending}
                                aria-label={`Reassign ${chore.title}`}
                              >
                                <option value="">Unassigned</option>
                                {members.map((member) => (
                                  <option key={member.membershipId} value={member.membershipId}>
                                    {member.displayName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>
                        <ActionButton
                          size="sm"
                          onClick={() => handleComplete(chore.choreId)}
                          disabled={isPending}
                        >
                          Complete
                        </ActionButton>
                      </div>
                    </div>
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

function NeedsAttentionSection() {
  const {
    viewModel,
    isPending,
    handleDismissReminder,
    handleSnoozeReminder
  } = useFamilyCommandCenterContext();

  if (!viewModel) {
    return null;
  }

  const hasContent = viewModel.needsAttention.overdueReminders.length > 0
    || viewModel.needsAttention.openChores.length > 0
    || viewModel.needsAttention.schedulePressure.length > 0;

  return (
    <HouseholdSection
      eyebrow="Needs attention"
      title="What could slip without a quick check"
      description="Overdue prompts, open chores, and same-day schedule pressure stay together so the household can triage in one pass."
      id="needs-attention"
      data-testid="needs-attention-section"
    >
      {!hasContent ? (
        <HouseholdEmptyState variant="quiet-day" />
      ) : (
        <div className="family-two-column-grid">
          <div className="space-y-4">
            {viewModel.needsAttention.overdueReminders.length > 0 ? (
              <div className="space-y-3">
                <div className="eyebrow home-attention-label">Overdue reminders</div>
                {viewModel.needsAttention.overdueReminders.map((reminder) => (
                  <div className="stack-card stack-card-warning reminder-card" key={reminder.key}>
                    <div className="stack-card-header">
                      <div className="min-w-0 flex-1">
                        <strong>{reminder.title}</strong>
                        <div className="muted">
                          Due {formatReminderDueLabel(reminder.dueAtUtc)} · {reminder.minutesBefore} min before
                        </div>
                        <HouseholdMetaBadges
                          kind={reminder.kind}
                          sourceLabel={reminder.sourceLabel}
                          urgencyState={reminder.urgencyState}
                        />
                      </div>
                      <span className="pill reminder-overdue-pill">
                        {formatReminderTriageState(reminder.dueAtUtc)}
                      </span>
                    </div>
                    <div className="action-row compact-action-row">
                      {reminder.canSnooze ? (
                        <ActionButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSnoozeReminder(reminder.reminderId, 60)}
                          disabled={isPending}
                        >
                          Snooze 1h
                        </ActionButton>
                      ) : null}
                      {reminder.canSnooze ? (
                        <ActionButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSnoozeReminder(reminder.reminderId, 1_440)}
                          disabled={isPending}
                        >
                          Snooze 1d
                        </ActionButton>
                      ) : null}
                      {reminder.canDismiss ? (
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismissReminder(reminder.reminderId)}
                          disabled={isPending}
                        >
                          Dismiss
                        </ActionButton>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {viewModel.needsAttention.openChores.length > 0 ? (
              <div className="space-y-3">
                <div className="eyebrow home-attention-label">Open chores</div>
                {viewModel.needsAttention.openChores.slice(0, 4).map((chore) => (
                  <div className="stack-card home-attention-card" key={chore.key}>
                    <div className="stack-card-header">
                      <div className="min-w-0 flex-1">
                        <strong>{chore.title}</strong>
                        <HouseholdMetaBadges
                          owner={chore.ownerDisplay}
                          kind={chore.kind}
                          urgencyState={chore.urgencyState}
                        />
                      </div>
                      <span className="pill pill-warning">Open</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="family-support-card">
              <div className="eyebrow">Schedule pressure</div>
              <h3 className="m-0 text-xl font-semibold text-[color:var(--text-strong)]">
                Conflicts worth a glance
              </h3>
              {viewModel.needsAttention.schedulePressure.length === 0 ? (
                <p className="muted mb-0 mt-3">
                  No overlapping timed events are visible in today&apos;s home payload.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {viewModel.needsAttention.schedulePressure.map((item) => (
                    <div className="stack-card" key={item.key}>
                      <strong>{item.title}</strong>
                      <div className="muted">{item.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {viewModel.needsAttention.upcomingReminders.length > 0 ? (
              <div className="family-support-card">
                <div className="eyebrow">Due soon</div>
                <h3 className="m-0 text-xl font-semibold text-[color:var(--text-strong)]">
                  Reminders approaching next
                </h3>
                <div className="mt-4 space-y-3">
                  {viewModel.needsAttention.upcomingReminders.slice(0, 3).map((reminder) => (
                    <div className="stack-card" key={reminder.key}>
                      <div className="stack-card-header">
                        <div className="min-w-0 flex-1">
                          <strong>{reminder.title}</strong>
                          <div className="muted">
                            {formatReminderTriageState(reminder.dueAtUtc)} · {reminder.minutesBefore} min before
                          </div>
                        </div>
                        <HouseholdMetaBadges urgencyState={reminder.urgencyState} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </HouseholdSection>
  );
}

function HouseholdBoardSection() {
  const {
    viewModel,
    isPending,
    showNoteForm,
    setShowNoteForm,
    noteTitle,
    setNoteTitle,
    noteBody,
    setNoteBody,
    handleAddNote,
    handleTogglePin
  } = useFamilyCommandCenterContext();

  const noteTitleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showNoteForm) {
      noteTitleRef.current?.focus();
    }
  }, [showNoteForm]);

  if (!viewModel) {
    return null;
  }

  const hasBoardContent = viewModel.householdBoard.pinnedNotes.length > 0
    || viewModel.householdBoard.importantReminders.length > 0
    || viewModel.householdBoard.recentActivity.length > 0;

  return (
    <HouseholdSection
      eyebrow="Household Board"
      title="Shared household context"
      description="Pinned notes, important prompts, and warm household context stay together here so the page feels like one operating surface."
      actions={
        <ActionButton
          size="sm"
          variant={showNoteForm ? "ghost" : "secondary"}
          onClick={() => setShowNoteForm(!showNoteForm)}
        >
          {showNoteForm ? "Close note" : "Add note"}
        </ActionButton>
      }
      id="household-board"
      data-testid="household-board-section"
    >
      {showNoteForm ? (
        <div className="family-support-card">
          <div className="eyebrow">Quick note</div>
          <div className="mt-3 grid gap-3">
            <input
              ref={noteTitleRef}
              aria-label="Note title"
              placeholder="Leave the household a note"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
            />
            <textarea
              aria-label="Note body"
              placeholder="Optional detail"
              rows={3}
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
            />
            <div className="action-row compact-action-row">
              <ActionButton onClick={handleAddNote} disabled={isPending || !noteTitle.trim()}>
                Add note
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={() => {
                  setShowNoteForm(false);
                  setNoteTitle("");
                  setNoteBody("");
                }}
                disabled={isPending}
              >
                Cancel
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {!hasBoardContent ? (
        <HouseholdEmptyState variant="board-clear" />
      ) : (
        <div className="family-board-grid">
          <div className="space-y-3">
            <div className="eyebrow">Pinned notes</div>
            {viewModel.householdBoard.pinnedNotes.length === 0 ? (
              <HouseholdEmptyState variant="board-clear" />
            ) : (
              viewModel.householdBoard.pinnedNotes.map((note) => (
                <HouseholdBoardCard
                  key={note.key}
                  title={note.title}
                  description={note.body}
                  meta={<HouseholdMetaBadges owner={note.ownerDisplay} kind={note.kind} />}
                  actions={
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePin(note.noteId)}
                      disabled={isPending}
                    >
                      Unpin
                    </ActionButton>
                  }
                />
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="eyebrow">Important reminders</div>
            {viewModel.householdBoard.importantReminders.length === 0 ? (
              <HouseholdEmptyState variant="board-clear" />
            ) : (
              viewModel.householdBoard.importantReminders.map((reminder) => (
                <HouseholdBoardCard
                  key={reminder.key}
                  tone={reminder.urgencyState === "overdue" ? "warning" : "default"}
                  title={reminder.title}
                  description={`${formatReminderTriageState(reminder.dueAtUtc)} · ${reminder.minutesBefore} min before`}
                  meta={
                    <HouseholdMetaBadges
                      kind={reminder.kind}
                      sourceLabel={reminder.sourceLabel}
                      urgencyState={reminder.urgencyState}
                    />
                  }
                />
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="eyebrow">Recently changed</div>
            {viewModel.householdBoard.recentActivity.length === 0 ? (
              <HouseholdEmptyState variant="board-clear" />
            ) : (
              viewModel.householdBoard.recentActivity.map((item, index) => (
                <HouseholdBoardCard
                  key={`${item.kind}-${item.occurredAtUtc}-${index}`}
                  title={item.title}
                  description={item.detail ?? (
                    item.kind === "ChoreCompletion"
                      ? `Completed by ${item.actorDisplayName}`
                      : item.kind === "NoteCreated"
                        ? `Note added by ${item.actorDisplayName}`
                        : "Reminder fired"
                  )}
                  meta={<span className="pill">{formatRelativeTime(item.occurredAtUtc)}</span>}
                />
              ))
            )}
          </div>

          <FoodSummaryPanel />
        </div>
      )}
    </HouseholdSection>
  );
}

function UpcomingSection() {
  const { viewModel } = useFamilyCommandCenterContext();

  if (!viewModel) {
    return null;
  }

  return (
    <HouseholdSection
      eyebrow="Upcoming"
      title="The next several household blocks"
      description="This keeps the near future visible without turning Overview into the full planning surface that Slice 2 will tackle."
      id="upcoming"
      data-testid="upcoming-section"
    >
      {viewModel.upcoming.length === 0 ? (
        <HouseholdEmptyState variant="nothing-upcoming" />
      ) : (
        <div className="family-upcoming-grid">
          {viewModel.upcoming.map((day) => (
            <div className="stack-card" key={day.date}>
              <div className="stack-card-header">
                <div>
                  <strong>{day.label}</strong>
                  <div className="muted">
                    {day.events.length} scheduled block{day.events.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="pill">{formatDayLabel(day.date)}</span>
              </div>
              <div className="stack-list">
                {day.events.map((event) => (
                  <div className="stack-card" key={event.key}>
                    <div className="stack-card-header">
                      <div className="min-w-0 flex-1">
                        <strong>{event.title}</strong>
                        <div className="muted">{formatTimeRange(event)}</div>
                        <HouseholdMetaBadges
                          kind={event.kind}
                          sourceLabel={event.sourceLabel}
                          urgencyState={event.urgencyState}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </HouseholdSection>
  );
}

function QuickAddSection() {
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
    applySuggestedEnd,
    isOwner
  } = useFamilyCommandCenterContext();

  if (!data) {
    return null;
  }

  const reminderEligibleUpcoming = data.upcomingDays
    .flatMap((day) => day.events)
    .filter((event) => event.canCreateReminder && !event.isAllDay && event.startsAtUtc);

  return (
    <HouseholdSection
      eyebrow="Quick add"
      title="Capture what the household just realized"
      description="Keep the existing event and reminder actions close at hand without forcing a jump into the admin planning surface."
      id="quick-add"
      data-testid="quick-add-section"
    >
      <div className="family-quick-add-grid">
        <div className="family-support-card">
          <div className="eyebrow">Event</div>
          <h3 className="m-0 text-xl font-semibold text-[color:var(--text-strong)]">
            Add a local household event
          </h3>
          {!showEventForm ? (
            <div className="action-row">
              <ActionButton
                variant="secondary"
                onClick={() => {
                  resetEventDraft();
                  setShowEventForm(true);
                }}
              >
                + Event
              </ActionButton>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <input
                aria-label="Event title"
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                placeholder="Event title"
              />
              <input
                aria-label="Event description"
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
                  aria-label="All day date"
                  type="date"
                  value={eventAllDayDate}
                  onChange={(event) => setEventAllDayDate(event.target.value)}
                />
              ) : (
                <>
                  <input
                    aria-label="Event starts"
                    type="datetime-local"
                    value={eventStart}
                    onChange={(event) => setEventStart(event.target.value)}
                  />
                  <div className="pill-row">
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setEventEnd(applySuggestedEnd(eventStart, 30))}
                      disabled={isPending || !eventStart}
                    >
                      End +30m
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setEventEnd(applySuggestedEnd(eventStart, 60))}
                      disabled={isPending || !eventStart}
                    >
                      End +1h
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setEventEnd(applySuggestedEnd(eventStart, 120))}
                      disabled={isPending || !eventStart}
                    >
                      End +2h
                    </ActionButton>
                  </div>
                  <input
                    aria-label="Event ends"
                    type="datetime-local"
                    value={eventEnd}
                    onChange={(event) => setEventEnd(event.target.value)}
                  />
                </>
              )}

              {eventValidationIssues.length > 0 ? (
                <div className="scheduling-validation-list" aria-live="polite">
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
                  onClick={() => {
                    setShowEventForm(false);
                    resetEventDraft();
                  }}
                  disabled={isPending}
                >
                  Cancel
                </ActionButton>
              </div>
            </div>
          )}
        </div>

        <div className="family-support-card">
          <div className="eyebrow">Reminder</div>
          <h3 className="m-0 text-xl font-semibold text-[color:var(--text-strong)]">
            Add a prompt to an existing event
          </h3>
          {!isOwner ? (
            <p className="muted mt-4 mb-0">
              Reminder creation is owner-managed. Members can still see household reminder state on the shared surfaces.
            </p>
          ) : !showReminderForm ? (
            <div className="action-row">
              <ActionButton variant="secondary" onClick={() => setShowReminderForm(true)}>
                + Reminder
              </ActionButton>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {reminderEligibleUpcoming.length === 0 ? (
                <p className="muted mb-0">
                  No backend-eligible upcoming events are available for reminders yet.
                </p>
              ) : (
                <>
                  <select
                    aria-label="Reminder event"
                    value={reminderEventId}
                    onChange={(event) => setReminderEventId(event.target.value)}
                  >
                    <option value="">Select an event…</option>
                    {reminderEligibleUpcoming.map((event) => (
                      <option key={event.scheduledEventId} value={event.scheduledEventId}>
                        {event.title} - {formatTime(event.startsAtUtc)}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Minutes before"
                    type="number"
                    min={1}
                    max={10080}
                    value={reminderMinutes}
                    onChange={(event) => setReminderMinutes(event.target.value)}
                  />
                  <div className="action-row compact-action-row">
                    <ActionButton
                      onClick={handleAddReminder}
                      disabled={isPending || !reminderEventId}
                    >
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
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </HouseholdSection>
  );
}

function FamilyCommandCenterBody() {
  const {
    data,
    isLoading,
    error,
    successMessage,
    setShowNoteForm
  } = useFamilyCommandCenterContext();
  const searchParams = useSearchParams();

  const todayRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const upcomingRef = useRef<HTMLDivElement | null>(null);

  const workspace = searchParams.get("workspace");
  const targetRef = useMemo(() => {
    if (workspace === "chores") {
      return todayRef;
    }

    if (workspace === "notes") {
      return boardRef;
    }

    if (workspace === "agenda") {
      return upcomingRef;
    }

    return null;
  }, [workspace]);

  useEffect(() => {
    if (!workspace || !data || !targetRef?.current) {
      return;
    }

    if (workspace === "notes") {
      setShowNoteForm(true);
    }

    targetRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, [data, setShowNoteForm, targetRef, workspace]);

  return (
    <PageContainer className="family-command-center">
      {error ? (
        <StatusMessage aria-live="polite" message={error} variant="danger" />
      ) : null}

      {successMessage ? (
        <StatusMessage aria-live="polite" message={successMessage} variant="success" />
      ) : null}

      <PageHeader
        className="space-y-5"
        data-testid="overview-workspace"
        description="A warm, family-facing command surface for what is happening now, what needs attention, and what is coming next."
        eyebrow="Overview"
        title="Family command center"
      />

      {isLoading ? (
        <Card aria-busy="true">
          <LoadingSpinner label="Loading family command center..." />
        </Card>
      ) : data ? (
        <div className="family-command-stack">
          <HeroSummaryStrip />
          <div ref={todayRef}>
            <TodayByMemberSection />
          </div>
          <NeedsAttentionSection />
          <div ref={boardRef}>
            <HouseholdBoardSection />
          </div>
          <div ref={upcomingRef}>
            <UpcomingSection />
          </div>
          <QuickAddSection />

          <section className="space-y-4">
            <div className="family-support-card">
              <div className="eyebrow">Support</div>
              <p className="muted mb-0">
                Developer-facing session controls stay available, but they sit below the family-facing command center now.
              </p>
            </div>
            <AuthStatusPanel />
          </section>
        </div>
      ) : (
        <Card>
          <EmptyState message="Sign in to see your household home." />
        </Card>
      )}
    </PageContainer>
  );
}

export function FamilyCommandCenter() {
  return (
    <FamilyCommandCenterProvider>
      <Suspense
        fallback={
          <Card aria-busy="true">
            <LoadingSpinner label="Loading family command center..." />
          </Card>
        }
      >
        <FamilyCommandCenterBody />
      </Suspense>
    </FamilyCommandCenterProvider>
  );
}
