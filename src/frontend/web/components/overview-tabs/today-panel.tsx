"use client";

import {
  ActionButton,
  Badge,
  Card,
  EmptyState,
  ListCard,
  LoadingSpinner,
  QuickActions,
  SectionHeader,
  StatCard
} from "@/components/ui";
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
        <Card>
          <LoadingSpinner label="Loading your household overview..." />
        </Card>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Today"
            title="What matters now"
            description="A quick household snapshot for events, chores, and the reminders most likely to affect today."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Events today" value={data.todayEvents.length} />
            <StatCard
              label="Open chores"
              tone={incompleteChores.length > 0 ? "warning" : "default"}
              value={incompleteChores.length}
            />
            <StatCard
              label="Pending reminders"
              tone={data.pendingReminderCount > 0 ? "accent" : "default"}
              value={data.pendingReminderCount}
            />
          </div>

          {!hasTodayContent ? (
            <EmptyState message="Nothing scheduled for today. Enjoy the calm." />
          ) : null}

          {data.todayEvents.length > 0 ? (
            <div className="space-y-3">
              <SectionHeader
                eyebrow="Events"
                title="Today's schedule"
                titleAs="h3"
                description="Keep the next plans visible without switching to the full agenda."
              />
              <div className="grid gap-3">
                {data.todayEvents.map((event, index) => (
                  <ListCard
                    key={`${event.title}-${index}`}
                    title={event.title}
                    description={!event.isAllDay && event.startsAtUtc
                      ? `${formatTime(event.startsAtUtc)}${event.endsAtUtc ? ` - ${formatTime(event.endsAtUtc)}` : ""}`
                      : "All day"}
                    action={event.isImported ? <Badge>Synced</Badge> : null}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <SectionHeader
            eyebrow="Attention"
            title="Keep the day moving"
            titleAs="h3"
            description="A short list of chores that still need a hand."
          />

          {incompleteChores.length > 0 ? (
            <div className="grid gap-3">
              {incompleteChores.slice(0, 4).map((chore) => (
                <ListCard
                  key={chore.id}
                  tone="warning"
                  eyebrow="Chore"
                  title={chore.title}
                  description={chore.assignedMemberName ?? "Ready for anyone in the household"}
                  action={<Badge variant="warning">Open</Badge>}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No chores need attention right now." />
          )}
        </Card>
      </section>

      {data.pendingReminders.length > 0 ? (
        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Reminders"
            title="Reminder triage"
            description="Dismiss or snooze pending reminders. Overdue reminders stay at the top until reviewed."
          />

          {overdueReminders.length > 0 ? (
            <div className="space-y-3">
              <SectionHeader eyebrow="Overdue" title="Needs a decision" titleAs="h3" />
              <div className="grid gap-3">
                {overdueReminders.map((reminder) => (
                  <ListCard
                    key={reminder.id}
                    tone="warning"
                    title={reminder.eventTitle}
                    description={`Due ${formatReminderDueLabel(reminder.dueAtUtc)} - ${reminder.minutesBefore} min before event`}
                    meta={formatReminderTriageState(reminder.dueAtUtc)}
                  >
                    <QuickActions label="Quick actions">
                      <ActionButton size="sm" variant="ghost" onClick={() => handleSnoozeReminder(reminder.id, 60)}>
                        Snooze 1h
                      </ActionButton>
                      <ActionButton size="sm" variant="ghost" onClick={() => handleSnoozeReminder(reminder.id, 1440)}>
                        Snooze 1d
                      </ActionButton>
                      <ActionButton size="sm" variant="outline" onClick={() => handleDismissReminder(reminder.id)}>
                        Dismiss
                      </ActionButton>
                    </QuickActions>
                  </ListCard>
                ))}
              </div>
            </div>
          ) : null}

          {upcomingReminders.length > 0 ? (
            <div className="space-y-3">
              <SectionHeader eyebrow="Upcoming" title="Still ahead" titleAs="h3" />
              <div className="grid gap-3">
                {upcomingReminders.map((reminder) => (
                  <ListCard
                    key={reminder.id}
                    title={reminder.eventTitle}
                    description={`Due ${formatReminderDueLabel(reminder.dueAtUtc)} - ${reminder.minutesBefore} min before event`}
                    meta={formatReminderTriageState(reminder.dueAtUtc)}
                  >
                    <QuickActions label="Quick actions">
                      <ActionButton size="sm" variant="ghost" onClick={() => handleSnoozeReminder(reminder.id, 60)}>
                        Snooze 1h
                      </ActionButton>
                      <ActionButton size="sm" variant="ghost" onClick={() => handleSnoozeReminder(reminder.id, 1440)}>
                        Snooze 1d
                      </ActionButton>
                      <ActionButton size="sm" variant="outline" onClick={() => handleDismissReminder(reminder.id)}>
                        Dismiss
                      </ActionButton>
                    </QuickActions>
                  </ListCard>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {data.recentActivity.length > 0 ? (
        <Card className="space-y-4">
          <SectionHeader
            eyebrow="Household"
            title="What changed recently"
            description="A quick feed of chores, notes, and reminder activity across the household."
          />
          <div className="grid gap-3">
            {data.recentActivity.map((item, index) => (
              <ListCard
                key={`${item.kind}-${item.occurredAtUtc}-${index}`}
                title={item.title}
                description={item.detail ?? (
                  item.kind === "ChoreCompletion"
                    ? `Completed by ${item.actorDisplayName}`
                    : item.kind === "NoteCreated"
                      ? `Note added by ${item.actorDisplayName}`
                      : "Reminder fired"
                )}
                action={<Badge>{formatRelativeTime(item.occurredAtUtc)}</Badge>}
                meta={item.detail
                  ? (
                    item.kind === "ChoreCompletion"
                      ? `Completed by ${item.actorDisplayName}`
                      : item.kind === "NoteCreated"
                        ? `Note added by ${item.actorDisplayName}`
                        : "Reminder fired"
                  )
                  : undefined}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <p className="error-text" role="alert">{error}</p>
        </Card>
      ) : null}
    </div>
  );
}
