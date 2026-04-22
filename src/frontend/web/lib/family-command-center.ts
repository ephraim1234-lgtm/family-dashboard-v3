export type HouseholdMemberOption = {
  membershipId: string;
  displayName: string;
};

export type HomeEvent = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isImported: boolean;
};

export type HomeChore = {
  id: string;
  title: string;
  assignedMembershipId: string | null;
  assignedMemberName: string | null;
  completedToday: boolean;
};

export type HomeNote = {
  id: string;
  title: string;
  body: string | null;
  authorDisplayName: string;
};

export type HomeActivityItem = {
  kind: "ChoreCompletion" | "NoteCreated" | "ReminderFired";
  title: string;
  detail: string | null;
  actorDisplayName: string;
  occurredAtUtc: string;
};

export type HomeUpcomingEvent = {
  scheduledEventId: string;
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isImported: boolean;
  isReadOnly: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateReminder: boolean;
  canManageReminders: boolean;
  reminderEligibilityReason: string | null;
};

export type HomeUpcomingDay = {
  date: string;
  events: HomeUpcomingEvent[];
};

export type HomeReminder = {
  id: string;
  eventTitle: string;
  minutesBefore: number;
  dueAtUtc: string;
  isReadOnly: boolean;
  canDismiss: boolean;
  canSnooze: boolean;
  canDelete: boolean;
};

export type HomeMemberChoreProgress = {
  memberDisplayName: string;
  completionsThisWeek: number;
  currentStreakDays: number;
};

export type HomeResponse = {
  todayEvents: HomeEvent[];
  todayChores: HomeChore[];
  pinnedNotes: HomeNote[];
  recentActivity: HomeActivityItem[];
  upcomingDays: HomeUpcomingDay[];
  pendingReminders: HomeReminder[];
  memberChoreProgress: HomeMemberChoreProgress[];
  upcomingEventCount: number;
  pendingReminderCount: number;
};

export type FamilyItemKind = "event" | "reminder" | "chore" | "note";
export type FamilySourceLabel = "local" | "imported" | "household";
export type FamilyUrgencyState = "now" | "next" | "soon" | "overdue" | "upcoming" | "background";
export type FamilyOwnerKind = "member" | "unassigned" | "household";

export type FamilyOwnerDisplay = {
  label: string;
  kind: FamilyOwnerKind;
};

type FamilyItemBase = {
  key: string;
  title: string;
  kind: FamilyItemKind;
  sourceLabel: FamilySourceLabel;
  urgencyState: FamilyUrgencyState;
  ownerDisplay: FamilyOwnerDisplay;
};

export type FamilyEventItem = FamilyItemBase & {
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isReadOnly: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateReminder: boolean;
  canManageReminders: boolean;
  reminderEligibilityReason: string | null;
};

export type FamilyReminderItem = FamilyItemBase & {
  reminderId: string;
  dueAtUtc: string;
  minutesBefore: number;
  isReadOnly: boolean;
  canDismiss: boolean;
  canSnooze: boolean;
  canDelete: boolean;
};

export type FamilyChoreItem = FamilyItemBase & {
  choreId: string;
  assignedMembershipId: string | null;
  completedToday: boolean;
};

export type FamilyNoteItem = FamilyItemBase & {
  noteId: string;
  body: string | null;
  authorDisplayName: string;
};

export type MemberLane = {
  key: string;
  label: string;
  ownerDisplay: FamilyOwnerDisplay;
  openChores: FamilyChoreItem[];
  completedCount: number;
  completionsThisWeek: number;
  currentStreakDays: number;
};

export type SchedulePressureItem = {
  key: string;
  title: string;
  detail: string;
};

export type CommandCenterHero = {
  happeningNow: FamilyEventItem[];
  nextUp: FamilyEventItem | null;
  summaryCards: Array<{
    label: string;
    value: number;
    tone: "default" | "warning" | "accent";
  }>;
};

export type CommandCenterViewModel = {
  hero: CommandCenterHero;
  memberLanes: MemberLane[];
  needsAttention: {
    overdueReminders: FamilyReminderItem[];
    upcomingReminders: FamilyReminderItem[];
    openChores: FamilyChoreItem[];
    schedulePressure: SchedulePressureItem[];
  };
  householdBoard: {
    pinnedNotes: FamilyNoteItem[];
    importantReminders: FamilyReminderItem[];
    recentActivity: HomeActivityItem[];
  };
  upcoming: Array<{
    date: string;
    label: string;
    events: FamilyEventItem[];
  }>;
};

function eventTime(dateUtc: string | null) {
  return dateUtc ? new Date(dateUtc).getTime() : Number.POSITIVE_INFINITY;
}

export function createHouseholdOwnerDisplay(label = "Household"): FamilyOwnerDisplay {
  return {
    label,
    kind: "household"
  };
}

export function createOwnerDisplay(memberName?: string | null): FamilyOwnerDisplay {
  if (memberName?.trim()) {
    return {
      label: memberName,
      kind: "member"
    };
  }

  return {
    label: "Unassigned",
    kind: "unassigned"
  };
}

export function getEventUrgencyState(
  event: Pick<HomeEvent, "startsAtUtc" | "endsAtUtc" | "isAllDay">,
  now = new Date()
): FamilyUrgencyState {
  if (event.isAllDay) {
    return "now";
  }

  if (!event.startsAtUtc) {
    return "background";
  }

  const start = new Date(event.startsAtUtc).getTime();
  const end = event.endsAtUtc ? new Date(event.endsAtUtc).getTime() : start;
  const nowMs = now.getTime();

  if (start <= nowMs && end > nowMs) {
    return "now";
  }

  const deltaMinutes = Math.round((start - nowMs) / 60_000);

  if (deltaMinutes <= 60) {
    return "next";
  }

  if (deltaMinutes <= 180) {
    return "soon";
  }

  return "upcoming";
}

export function getReminderUrgencyState(
  reminder: Pick<HomeReminder, "dueAtUtc">,
  now = new Date()
): FamilyUrgencyState {
  const deltaMinutes = Math.round((new Date(reminder.dueAtUtc).getTime() - now.getTime()) / 60_000);

  if (deltaMinutes < 0) {
    return "overdue";
  }

  if (deltaMinutes <= 30) {
    return "next";
  }

  if (deltaMinutes <= 180) {
    return "soon";
  }

  return "upcoming";
}

export function getChoreUrgencyState(chore: Pick<HomeChore, "completedToday">): FamilyUrgencyState {
  return chore.completedToday ? "background" : "soon";
}

export function getSourceLabel(isImported: boolean): FamilySourceLabel {
  return isImported ? "imported" : "local";
}

export function normalizeHomeEvent(event: HomeEvent, index: number, now = new Date()): FamilyEventItem {
  return {
    key: `today-event-${index}-${event.title}`,
    title: event.title,
    kind: "event",
    sourceLabel: getSourceLabel(event.isImported),
    urgencyState: getEventUrgencyState(event, now),
    ownerDisplay: createHouseholdOwnerDisplay(),
    startsAtUtc: event.startsAtUtc,
    endsAtUtc: event.endsAtUtc,
    isAllDay: event.isAllDay,
    isReadOnly: true,
    canEdit: false,
    canDelete: false,
    canCreateReminder: false,
    canManageReminders: false,
    reminderEligibilityReason: null
  };
}

export function normalizeUpcomingEvent(
  day: HomeUpcomingDay,
  event: HomeUpcomingEvent,
  index: number,
  now = new Date()
): FamilyEventItem {
  return {
    key: `upcoming-${day.date}-${index}-${event.title}`,
    title: event.title,
    kind: "event",
    sourceLabel: getSourceLabel(event.isImported),
    urgencyState: getEventUrgencyState(event, now),
    ownerDisplay: createHouseholdOwnerDisplay(),
    startsAtUtc: event.startsAtUtc,
    endsAtUtc: event.endsAtUtc,
    isAllDay: event.isAllDay,
    isReadOnly: event.isReadOnly,
    canEdit: event.canEdit,
    canDelete: event.canDelete,
    canCreateReminder: event.canCreateReminder,
    canManageReminders: event.canManageReminders,
    reminderEligibilityReason: event.reminderEligibilityReason
  };
}

export function normalizeHomeReminder(reminder: HomeReminder, now = new Date()): FamilyReminderItem {
  return {
    key: `reminder-${reminder.id}`,
    reminderId: reminder.id,
    title: reminder.eventTitle,
    kind: "reminder",
    sourceLabel: "household",
    urgencyState: getReminderUrgencyState(reminder, now),
    ownerDisplay: createHouseholdOwnerDisplay(),
    dueAtUtc: reminder.dueAtUtc,
    minutesBefore: reminder.minutesBefore,
    isReadOnly: reminder.isReadOnly,
    canDismiss: reminder.canDismiss,
    canSnooze: reminder.canSnooze,
    canDelete: reminder.canDelete
  };
}

export function normalizeHomeChore(chore: HomeChore): FamilyChoreItem {
  return {
    key: `chore-${chore.id}`,
    choreId: chore.id,
    title: chore.title,
    kind: "chore",
    sourceLabel: "household",
    urgencyState: getChoreUrgencyState(chore),
    ownerDisplay: createOwnerDisplay(chore.assignedMemberName),
    assignedMembershipId: chore.assignedMembershipId,
    completedToday: chore.completedToday
  };
}

export function normalizeHomeNote(note: HomeNote): FamilyNoteItem {
  return {
    key: `note-${note.id}`,
    noteId: note.id,
    title: note.title,
    kind: "note",
    sourceLabel: "household",
    urgencyState: "background",
    ownerDisplay: {
      label: note.authorDisplayName,
      kind: "member"
    },
    body: note.body,
    authorDisplayName: note.authorDisplayName
  };
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return "Unscheduled";
  return new Date(isoString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatTimeRange(
  item: Pick<FamilyEventItem, "isAllDay" | "startsAtUtc" | "endsAtUtc">
): string {
  if (item.isAllDay) return "All day";
  if (!item.startsAtUtc) return "Unscheduled";

  const start = formatTime(item.startsAtUtc);
  if (!item.endsAtUtc) {
    return start;
  }

  return `${start} - ${formatTime(item.endsAtUtc)}`;
}

export function formatRelativeTime(utc: string, now = new Date()): string {
  const diffMs = now.getTime() - new Date(utc).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDayLabel(dateStr: string): string {
  const day = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (day.toDateString() === today.toDateString()) return "Today";
  if (day.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return day.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function formatWeekdayShort(dateStr: string): string {
  const day = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  if (day.toDateString() === today.toDateString()) return "Today";
  return day.toLocaleDateString([], { weekday: "short" });
}

export function formatReminderDueLabel(utc: string): string {
  const due = new Date(utc);
  return (
    due.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
    " " +
    due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

export function formatReminderLeadLabel(minutesBefore: number): string {
  if (minutesBefore < 60) {
    return `${minutesBefore} min before`;
  }

  if (minutesBefore === 60) {
    return "1 hr before";
  }

  const hours = Math.round(minutesBefore / 60);
  return `${hours} hr before`;
}

export function formatReminderTriageState(utc: string, now = new Date()): string {
  const deltaMinutes = Math.round((new Date(utc).getTime() - now.getTime()) / 60_000);

  if (deltaMinutes < 0) {
    const overdueMinutes = Math.abs(deltaMinutes);
    if (overdueMinutes < 60) return `Overdue by ${overdueMinutes} min`;
    if (overdueMinutes % 60 === 0) return `Overdue by ${overdueMinutes / 60} hr`;
    return `Overdue by ${overdueMinutes} min`;
  }

  if (deltaMinutes < 60) return `Due in ${deltaMinutes} min`;
  if (deltaMinutes % 60 === 0) return `Due in ${deltaMinutes / 60} hr`;
  return `Due in ${deltaMinutes} min`;
}

export function findHappeningNow(items: FamilyEventItem[], now = new Date()): FamilyEventItem[] {
  return items.filter((item) => {
    if (item.isAllDay) {
      return true;
    }

    if (!item.startsAtUtc) {
      return false;
    }

    const start = new Date(item.startsAtUtc).getTime();
    const end = item.endsAtUtc ? new Date(item.endsAtUtc).getTime() : start;
    const nowMs = now.getTime();
    return start <= nowMs && end > nowMs;
  });
}

export function findNextUp(
  todayItems: FamilyEventItem[],
  upcomingItems: FamilyEventItem[],
  now = new Date()
): FamilyEventItem | null {
  const nextTimedToday = todayItems
    .filter((item) => !item.isAllDay && item.startsAtUtc && new Date(item.startsAtUtc).getTime() > now.getTime())
    .sort((left, right) => eventTime(left.startsAtUtc) - eventTime(right.startsAtUtc))[0];

  if (nextTimedToday) {
    return nextTimedToday;
  }

  return upcomingItems
    .filter((item) => !item.isAllDay)
    .sort((left, right) => eventTime(left.startsAtUtc) - eventTime(right.startsAtUtc))[0] ?? null;
}

export function detectSchedulePressure(events: HomeEvent[]): SchedulePressureItem[] {
  const timedEvents = events
    .filter((event) => !event.isAllDay && event.startsAtUtc && event.endsAtUtc)
    .sort((left, right) => eventTime(left.startsAtUtc) - eventTime(right.startsAtUtc));

  const overlaps: SchedulePressureItem[] = [];

  for (let index = 1; index < timedEvents.length; index += 1) {
    const previous = timedEvents[index - 1];
    const current = timedEvents[index];

    if (!previous.startsAtUtc || !previous.endsAtUtc || !current.startsAtUtc || !current.endsAtUtc) {
      continue;
    }

    if (new Date(current.startsAtUtc).getTime() < new Date(previous.endsAtUtc).getTime()) {
      overlaps.push({
        key: `pressure-${index}-${previous.title}-${current.title}`,
        title: `${previous.title} overlaps ${current.title}`,
        detail: `${formatTime(previous.startsAtUtc)} - ${formatTime(current.endsAtUtc)}`
      });
    }
  }

  return overlaps;
}

export function buildMemberLanes(
  chores: HomeChore[],
  progress: HomeMemberChoreProgress[]
): MemberLane[] {
  const normalizedChores = chores.map(normalizeHomeChore);
  const grouped = new Map<string, MemberLane>();
  const progressByMember = new Map(progress.map((item) => [item.memberDisplayName, item]));

  for (const chore of normalizedChores) {
    const key = chore.assignedMembershipId ?? `member:${chore.ownerDisplay.label}`;
    const existing = grouped.get(key) ?? {
      key,
      label: chore.ownerDisplay.label,
      ownerDisplay: chore.ownerDisplay,
      openChores: [],
      completedCount: 0,
      completionsThisWeek: progressByMember.get(chore.ownerDisplay.label)?.completionsThisWeek ?? 0,
      currentStreakDays: progressByMember.get(chore.ownerDisplay.label)?.currentStreakDays ?? 0
    };

    if (chore.completedToday) {
      existing.completedCount += 1;
    } else {
      existing.openChores.push(chore);
    }

    grouped.set(key, existing);
  }

  for (const member of progress) {
    if (Array.from(grouped.values()).some((lane) => lane.label === member.memberDisplayName)) {
      continue;
    }

    grouped.set(`member:${member.memberDisplayName}`, {
      key: `member:${member.memberDisplayName}`,
      label: member.memberDisplayName,
      ownerDisplay: {
        label: member.memberDisplayName,
        kind: "member"
      },
      openChores: [],
      completedCount: 0,
      completionsThisWeek: member.completionsThisWeek,
      currentStreakDays: member.currentStreakDays
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.ownerDisplay.kind === "unassigned" && right.ownerDisplay.kind !== "unassigned") {
      return 1;
    }

    if (right.ownerDisplay.kind === "unassigned" && left.ownerDisplay.kind !== "unassigned") {
      return -1;
    }

    if (right.openChores.length !== left.openChores.length) {
      return right.openChores.length - left.openChores.length;
    }

    return left.label.localeCompare(right.label);
  });
}

export function buildCommandCenterViewModel(data: HomeResponse, now = new Date()): CommandCenterViewModel {
  const todayEvents = data.todayEvents.map((event, index) => normalizeHomeEvent(event, index, now));
  const upcomingDays = data.upcomingDays.map((day) => ({
    date: day.date,
    label: formatDayLabel(day.date),
    events: day.events
      .map((event, index) => normalizeUpcomingEvent(day, event, index, now))
      .sort((left, right) => eventTime(left.startsAtUtc) - eventTime(right.startsAtUtc))
  }));
  const upcomingEvents = upcomingDays.flatMap((day) => day.events);
  const pendingReminders = data.pendingReminders
    .map((reminder) => normalizeHomeReminder(reminder, now))
    .sort((left, right) => new Date(left.dueAtUtc).getTime() - new Date(right.dueAtUtc).getTime());
  const overdueReminders = pendingReminders.filter((reminder) => reminder.urgencyState === "overdue");
  const upcomingReminders = pendingReminders.filter((reminder) => reminder.urgencyState !== "overdue");
  const openChores = data.todayChores
    .map(normalizeHomeChore)
    .filter((chore) => !chore.completedToday);
  const pinnedNotes = data.pinnedNotes.map(normalizeHomeNote);

  return {
    hero: {
      happeningNow: findHappeningNow(todayEvents, now).slice(0, 2),
      nextUp: findNextUp(todayEvents, upcomingEvents, now),
      summaryCards: [
        {
          label: "Open chores",
          value: openChores.length,
          tone: openChores.length > 0 ? "warning" : "default"
        },
        {
          label: "Pending reminders",
          value: data.pendingReminders.length,
          tone: overdueReminders.length > 0 ? "warning" : "accent"
        },
        {
          label: "Upcoming blocks",
          value: data.upcomingEventCount,
          tone: "default"
        }
      ]
    },
    memberLanes: buildMemberLanes(data.todayChores, data.memberChoreProgress),
    needsAttention: {
      overdueReminders,
      upcomingReminders,
      openChores,
      schedulePressure: detectSchedulePressure(data.todayEvents)
    },
    householdBoard: {
      pinnedNotes,
      importantReminders: pendingReminders.slice(0, 3),
      recentActivity: data.recentActivity
    },
    upcoming: upcomingDays
  };
}
