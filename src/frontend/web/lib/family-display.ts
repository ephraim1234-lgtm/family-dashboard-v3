import {
  createHouseholdOwnerDisplay,
  createOwnerDisplay,
  findHappeningNow,
  findNextUp,
  formatReminderLeadLabel,
  formatReminderTriageState,
  getEventUrgencyState,
  getReminderUrgencyState,
  getSourceLabel,
  type FamilyEventItem,
  type FamilyNoteItem,
  type FamilyReminderItem,
  type FamilySourceLabel,
  type FamilyUrgencyState
} from "./family-command-center";

export type DisplayAgendaItem = {
  title: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  description: string | null;
  isImported: boolean;
  sourceKind: string | null;
};

export type DisplayAgendaSection = {
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

export type DisplayReminderItem = {
  eventTitle: string;
  minutesBefore: number;
  dueAtUtc: string;
};

export type DisplayChoreItem = {
  title: string;
  assignedMemberName: string | null;
  recurrenceKind: string;
};

export type DisplayNoteItem = {
  title: string;
  body: string | null;
  authorDisplayName: string;
};

export type DisplaySnapshot = {
  accessMode: string;
  deviceName: string;
  householdName: string;
  householdTimeZoneId: string;
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

export type DisplayAgendaCard = FamilyEventItem & {
  description: string | null;
  isImported: boolean;
  sourceKind: string | null;
  timeLabel: string;
  dayLabel: string;
  relativeLabel: string | null;
  dateKey: string;
  isToday: boolean;
};

export type DisplayReminderCard = FamilyReminderItem & {
  dueLabel: string;
  leadLabel: string;
  triageLabel: string;
};

export type DisplayChoreCard = {
  key: string;
  title: string;
  recurrenceLabel: string;
  sourceLabel: FamilySourceLabel;
  urgencyState: FamilyUrgencyState;
  ownerDisplay: ReturnType<typeof createOwnerDisplay>;
};

export type DisplayNoteCard = FamilyNoteItem & {
  authorLabel: string;
};

export type DisplayViewModel = {
  householdName: string;
  deviceName: string;
  accessTokenHint: string;
  householdTimeZoneId: string;
  presentationMode: "Balanced" | "FocusNext";
  agendaDensityMode: "Comfortable" | "Dense";
  todayLabel: string;
  clockTimeLabel: string;
  clockDateLabel: string;
  windowLabel: string;
  generatedLabel: string;
  nowItems: DisplayAgendaCard[];
  nextItem: DisplayAgendaCard | null;
  todayAgenda: DisplayAgendaCard[];
  allDayItems: DisplayAgendaCard[];
  upcomingDays: Array<{
    date: string;
    label: string;
    items: DisplayAgendaCard[];
  }>;
  reminders: DisplayReminderCard[];
  chores: DisplayChoreCard[];
  notes: DisplayNoteCard[];
  todayEventCount: number;
  boardCount: number;
};

export type DisplaySurfaceStatus = "loading" | "live" | "stale" | "error";

export type DisplaySurfaceState = {
  snapshot: DisplaySnapshot | null;
  status: DisplaySurfaceStatus;
  failureCount: number;
  staleSinceUtc: string | null;
  lastRefreshedAtUtc: string | null;
  errorMessage: string | null;
  shouldReload: boolean;
};

const DISPLAY_TEST_REFRESH_KEY = "__HOUSEHOLDOPS_DISPLAY_REFRESH_INTERVAL_MS";

function formatInTimeZone(
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

function getDateKeyInTimeZone(value: string | Date, timeZone: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function createDisplayDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function formatDisplayDayLabel(dateKey: string, timeZone: string, now = new Date()) {
  const todayKey = getDateKeyInTimeZone(now, timeZone);
  const tomorrowKey = getDateKeyInTimeZone(new Date(now.getTime() + 86_400_000), timeZone);

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === tomorrowKey) {
    return "Tomorrow";
  }

  return formatInTimeZone(createDisplayDate(dateKey), "UTC", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatDisplayTime(value: string, timeZone: string) {
  return formatInTimeZone(value, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDisplayDateTime(value: string, timeZone: string) {
  return formatInTimeZone(value, timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatDisplayClockTime(now: Date, timeZone: string) {
  return formatInTimeZone(now, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatDisplayClockDate(now: Date, timeZone: string) {
  return formatInTimeZone(now, timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

export function formatDisplayTimeRange(
  item: Pick<DisplayAgendaItem, "isAllDay" | "startsAtUtc" | "endsAtUtc">,
  timeZone: string
) {
  if (item.isAllDay) {
    return "All day";
  }

  if (!item.startsAtUtc) {
    return "Unscheduled";
  }

  const start = formatDisplayTime(item.startsAtUtc, timeZone);
  if (!item.endsAtUtc) {
    return start;
  }

  return `${start} - ${formatDisplayTime(item.endsAtUtc, timeZone)}`;
}

export function formatDisplayWindowLabel(
  startUtc: string,
  endUtc: string,
  timeZone: string
) {
  const startLabel = formatInTimeZone(startUtc, timeZone, {
    month: "short",
    day: "numeric"
  });
  const endLabel = formatInTimeZone(endUtc, timeZone, {
    month: "short",
    day: "numeric"
  });

  return `${startLabel} - ${endLabel}`;
}

export function formatDisplayRelativeStart(startsAtUtc: string | null, now = new Date()) {
  if (!startsAtUtc) {
    return null;
  }

  const diffMinutes = Math.round((new Date(startsAtUtc).getTime() - now.getTime()) / 60_000);
  if (diffMinutes <= 0) {
    return "Now";
  }

  if (diffMinutes < 60) {
    return `In ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) {
    return `In ${hours} hr`;
  }

  return `In ${hours} hr ${minutes} min`;
}

export function normalizeDisplayAgendaItem(
  item: DisplayAgendaItem,
  index: number,
  timeZone: string,
  now = new Date()
): DisplayAgendaCard {
  const dateKey = getDateKeyInTimeZone(item.startsAtUtc ?? now, timeZone);

  return {
    key: `display-event-${index}-${item.title}-${item.startsAtUtc ?? "unscheduled"}`,
    title: item.title,
    kind: "event",
    sourceLabel: getSourceLabel(item.isImported),
    urgencyState: getEventUrgencyState(item, now),
    ownerDisplay: createHouseholdOwnerDisplay(),
    startsAtUtc: item.startsAtUtc,
    endsAtUtc: item.endsAtUtc,
    isAllDay: item.isAllDay,
    isReadOnly: true,
    canEdit: false,
    canDelete: false,
    canCreateReminder: false,
    canManageReminders: false,
    reminderEligibilityReason: item.isImported
      ? "Imported calendar events are read-only and cannot have local reminders."
      : null,
    description: item.description,
    isImported: item.isImported,
    sourceKind: item.sourceKind,
    timeLabel: formatDisplayTimeRange(item, timeZone),
    dayLabel: formatDisplayDayLabel(dateKey, timeZone, now),
    relativeLabel: formatDisplayRelativeStart(item.startsAtUtc, now),
    dateKey,
    isToday: dateKey === getDateKeyInTimeZone(now, timeZone)
  };
}

export function buildDisplayViewModel(snapshot: DisplaySnapshot, now = new Date()): DisplayViewModel {
  const timeZone = snapshot.householdTimeZoneId;
  const agendaItems = snapshot.agendaSection.items.map((item, index) =>
    normalizeDisplayAgendaItem(item, index, timeZone, now)
  );
  const todayEvents = agendaItems.filter((item) => item.isToday);
  const futureEvents = agendaItems.filter((item) => !item.isToday);
  const nowItems = findHappeningNow(todayEvents, now) as DisplayAgendaCard[];
  const nextItem = findNextUp(todayEvents, futureEvents, now) as DisplayAgendaCard | null;
  const activeKeys = new Set(nowItems.map((item) => item.key));
  if (nextItem) {
    activeKeys.add(nextItem.key);
  }

  const todayAgenda = todayEvents
    .filter((item) =>
      !item.isAllDay
      && !activeKeys.has(item.key)
      && !!item.startsAtUtc
      && new Date(item.startsAtUtc).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.startsAtUtc ?? now).getTime() - new Date(right.startsAtUtc ?? now).getTime());

  const allDayItems = todayEvents.filter((item) => item.isAllDay);

  const groupedUpcoming = new Map<string, DisplayAgendaCard[]>();
  for (const item of futureEvents) {
    const group = groupedUpcoming.get(item.dateKey) ?? [];
    group.push(item);
    groupedUpcoming.set(item.dateKey, group);
  }

  const upcomingDays = Array.from(groupedUpcoming.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => ({
      date,
      label: items[0]?.dayLabel ?? formatDisplayDayLabel(date, timeZone, now),
      items: items.sort(
        (left, right) => new Date(left.startsAtUtc ?? now).getTime() - new Date(right.startsAtUtc ?? now).getTime()
      )
    }));

  const reminders = snapshot.upcomingReminders.map((reminder, index) => ({
    key: `display-reminder-${index}-${reminder.dueAtUtc}`,
    reminderId: `display-${index}`,
    title: reminder.eventTitle,
    kind: "reminder" as const,
    sourceLabel: "household" as const,
    urgencyState: getReminderUrgencyState({ dueAtUtc: reminder.dueAtUtc }, now),
    ownerDisplay: createHouseholdOwnerDisplay(),
    dueAtUtc: reminder.dueAtUtc,
    minutesBefore: reminder.minutesBefore,
    isReadOnly: true,
    canDismiss: false,
    canSnooze: false,
    canDelete: false,
    dueLabel: formatDisplayDateTime(reminder.dueAtUtc, timeZone),
    leadLabel: formatReminderLeadLabel(reminder.minutesBefore),
    triageLabel: formatReminderTriageState(reminder.dueAtUtc, now)
  }));

  const chores = snapshot.dueChores.map((chore, index) => ({
    key: `display-chore-${index}-${chore.title}`,
    title: chore.title,
    recurrenceLabel: chore.recurrenceKind === "Daily" ? "Daily" : "Weekly cadence",
    sourceLabel: "household" as const,
    urgencyState: "soon" as const,
    ownerDisplay: createOwnerDisplay(chore.assignedMemberName)
  }));

  const notes = snapshot.pinnedNotes.map((note, index) => ({
    key: `display-note-${index}-${note.title}`,
    noteId: `display-${index}`,
    title: note.title,
    kind: "note" as const,
    sourceLabel: "household" as const,
    urgencyState: "background" as const,
    ownerDisplay: createOwnerDisplay(note.authorDisplayName),
    body: note.body,
    authorDisplayName: note.authorDisplayName,
    authorLabel: `Pinned by ${note.authorDisplayName}`
  }));

  return {
    householdName: snapshot.householdName,
    deviceName: snapshot.deviceName,
    accessTokenHint: snapshot.accessTokenHint,
    householdTimeZoneId: timeZone,
    presentationMode: snapshot.presentationMode,
    agendaDensityMode: snapshot.agendaDensityMode,
    todayLabel: formatDisplayDayLabel(getDateKeyInTimeZone(now, timeZone), timeZone, now),
    clockTimeLabel: formatDisplayClockTime(now, timeZone),
    clockDateLabel: formatDisplayClockDate(now, timeZone),
    windowLabel: formatDisplayWindowLabel(
      snapshot.agendaSection.windowStartUtc,
      snapshot.agendaSection.windowEndUtc,
      timeZone
    ),
    generatedLabel: formatDisplayDateTime(snapshot.generatedAtUtc, timeZone),
    nowItems,
    nextItem,
    todayAgenda,
    allDayItems,
    upcomingDays,
    reminders,
    chores,
    notes,
    todayEventCount: todayEvents.length,
    boardCount: reminders.length + chores.length + notes.length
  };
}

export function createInitialDisplaySurfaceState(): DisplaySurfaceState {
  return {
    snapshot: null,
    status: "loading",
    failureCount: 0,
    staleSinceUtc: null,
    lastRefreshedAtUtc: null,
    errorMessage: null,
    shouldReload: false
  };
}

export function applyDisplayRefreshSuccess(
  snapshot: DisplaySnapshot,
  refreshedAtUtc: string,
  _previousState?: DisplaySurfaceState
): DisplaySurfaceState {
  return {
    snapshot,
    status: "live",
    failureCount: 0,
    staleSinceUtc: null,
    lastRefreshedAtUtc: refreshedAtUtc,
    errorMessage: null,
    shouldReload: false
  };
}

export function applyDisplayRefreshFailure(
  previousState: DisplaySurfaceState,
  failedAtUtc: string,
  maxFailures = 3
): DisplaySurfaceState {
  const failureCount = previousState.failureCount + 1;

  if (previousState.snapshot) {
    return {
      ...previousState,
      status: "stale",
      failureCount,
      staleSinceUtc: previousState.staleSinceUtc ?? failedAtUtc,
      errorMessage: "Connection interrupted. Showing the last household board while the display retries.",
      shouldReload: false
    };
  }

  return {
    ...previousState,
    status: "error",
    failureCount,
    staleSinceUtc: null,
    errorMessage:
      failureCount >= maxFailures
        ? "Display connection is still unavailable. Reloading the display."
        : "Unable to load the household display yet. Retrying in the background.",
    shouldReload: failureCount >= maxFailures
  };
}

export function getDisplayRefreshIntervalMs() {
  if (typeof window === "undefined") {
    return 60_000;
  }

  const testValue = (window as typeof window & { [DISPLAY_TEST_REFRESH_KEY]?: unknown })[DISPLAY_TEST_REFRESH_KEY];
  if (typeof testValue === "number" && Number.isFinite(testValue) && testValue > 0) {
    return testValue;
  }

  return 60_000;
}
