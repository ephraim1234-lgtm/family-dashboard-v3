import type { HomeResponse } from "./family-command-center";
import {
  createOwnerDisplay,
  formatDayLabel,
  formatReminderDueLabel,
  formatTimeRange,
  getReminderUrgencyState,
  type FamilyItemKind,
  type FamilyOwnerDisplay,
  type FamilySourceLabel,
  type FamilyUrgencyState
} from "./family-command-center";
import type {
  EventReminderItem,
  ScheduledEventSeriesItem,
  UpcomingEventItem,
  UpcomingEventsResponse
} from "@/components/scheduling";

export type CalendarAccessState = "editable" | "read-only";

type CalendarItemBase = {
  key: string;
  title: string;
  description: string | null;
  ownerDisplay: FamilyOwnerDisplay;
  kind: FamilyItemKind;
  sourceLabel: FamilySourceLabel;
  urgencyState: FamilyUrgencyState;
  accessState: CalendarAccessState;
};

export type CalendarEventItem = CalendarItemBase & {
  kind: "event";
  id: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isAllDay: boolean;
  isImported: boolean;
  sourceKind: string | null;
  timeLabel: string;
  detailLabel: string;
  recurrenceSummary: string | null;
  isGoogleMirrorEnabled: boolean;
  googleSyncStatus: string | null;
  googleSyncError: string | null;
  googleTargetDisplayName: string | null;
  lastGoogleSyncSucceededAtUtc: string | null;
  googleSyncLabel: string | null;
};

export type CalendarReminderItem = CalendarItemBase & {
  kind: "reminder";
  id: string;
  scheduledEventId: string;
  dueAtUtc: string;
  minutesBefore: number;
  status: string;
  firedAtUtc: string | null;
  dueLabel: string;
  detailLabel: string;
};

export type CalendarDayEntry = CalendarEventItem | CalendarReminderItem;

export type CalendarDayGroup = {
  date: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
  items: CalendarDayEntry[];
  busyLabel: string;
  eventCount: number;
  reminderCount: number;
};

export type CalendarMonthIndicatorTone = "local" | "imported" | "reminder";

export type CalendarMonthDay = {
  date: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  items: CalendarDayEntry[];
  busyLabel: string;
  eventCount: number;
  reminderCount: number;
  indicatorTones: CalendarMonthIndicatorTone[];
  overflowCount: number;
};

export type CalendarSelectedDay = CalendarDayGroup & {
  title: string;
  fullLabel: string;
  createLabel: string;
};

export type FamilyCalendarViewModel = {
  weekStartUtc: string;
  weekEndUtc: string;
  weekRangeLabel: string;
  totalEvents: number;
  importedCount: number;
  reminderCount: number;
  editableCount: number;
  days: CalendarDayGroup[];
  focusSummary: {
    todayLabel: string;
    todayEventCount: number;
    todayReminderCount: number;
    nextEvent: CalendarEventItem | null;
    noteCount: number;
  };
  mobileMonth: {
    monthStartUtc: string;
    monthLabel: string;
    weekdayHeaders: string[];
    selectedDate: string;
    days: CalendarMonthDay[];
    selectedDay: CalendarSelectedDay;
  };
};

type BuildFamilyCalendarViewModelArgs = {
  weekAgenda: UpcomingEventsResponse | null;
  monthAgenda: UpcomingEventsResponse | null;
  reminders: EventReminderItem[];
  home: HomeResponse | null;
  seriesItems: ScheduledEventSeriesItem[];
  isOwner: boolean;
  visibleMonthStartUtc?: string;
  selectedDate?: string | null;
  now?: Date;
};

const monthWeekdayHeaders = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun"
] as const;

function startOfUtcDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getWeekStartUtc(anchor = new Date()) {
  const current = startOfUtcDay(anchor);
  const day = current.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  current.setUTCDate(current.getUTCDate() + offset);
  return current.toISOString();
}

export function addDaysUtc(startUtc: string, days: number) {
  const date = startOfUtcDay(startUtc);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function getMonthStartUtc(anchor = new Date()) {
  const current = startOfUtcDay(anchor);
  current.setUTCDate(1);
  return current.toISOString();
}

export function addMonthsUtc(monthStartUtc: string, months: number) {
  const date = startOfUtcDay(monthStartUtc);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

export function getMonthGridStartUtc(monthStartUtc: string) {
  const monthStart = startOfUtcDay(monthStartUtc);
  const day = monthStart.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  monthStart.setUTCDate(monthStart.getUTCDate() + offset);
  return monthStart.toISOString();
}

export function getMonthLabel(monthStartUtc: string) {
  return new Date(monthStartUtc).toLocaleDateString([], {
    month: "long",
    year: "numeric"
  });
}

export function getWeekRangeLabel(weekStartUtc: string, days: number) {
  const weekStart = new Date(weekStartUtc);
  const weekEnd = new Date(addDaysUtc(weekStartUtc, days - 1));
  const startLabel = weekStart.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
  const endLabel = weekEnd.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });

  if (weekStart.getFullYear() === weekEnd.getFullYear()) {
    return `${startLabel} - ${endLabel}, ${weekStart.getFullYear()}`;
  }

  return `${startLabel}, ${weekStart.getFullYear()} - ${endLabel}, ${weekEnd.getFullYear()}`;
}

function dateKeyFromUtc(isoString: string | null) {
  if (!isoString) {
    return null;
  }

  const date = new Date(isoString);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function isSameUtcMonth(leftUtc: string, rightUtc: string) {
  const left = new Date(leftUtc);
  const right = new Date(rightUtc);

  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth();
}

function formatMonthDayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

function formatSelectedDayLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

export function getDefaultSelectedDateForMonth(
  visibleMonthStartUtc: string,
  now = new Date()
) {
  if (isSameUtcMonth(visibleMonthStartUtc, now.toISOString())) {
    return dateKeyFromUtc(now.toISOString()) ?? visibleMonthStartUtc.slice(0, 10);
  }

  return visibleMonthStartUtc.slice(0, 10);
}

export function getCalendarAccessState(isOwner: boolean, isImported: boolean): CalendarAccessState {
  return isOwner && !isImported ? "editable" : "read-only";
}

export function getCalendarBusyLabel(itemCount: number) {
  if (itemCount >= 5) {
    return "Busy day";
  }

  if (itemCount >= 3) {
    return "Active day";
  }

  if (itemCount >= 1) {
    return "Light day";
  }

  return "Open day";
}

export function buildCalendarEventItem(
  event: UpcomingEventItem,
  seriesItem: ScheduledEventSeriesItem | null,
  isOwner: boolean,
  now = new Date()
): CalendarEventItem {
  const accessState = getCalendarAccessState(isOwner, event.isImported);
  const startsAtMs = event.startsAtUtc ? new Date(event.startsAtUtc).getTime() : Number.POSITIVE_INFINITY;
  let urgencyState: FamilyUrgencyState = "upcoming";

  if (event.isAllDay) {
    urgencyState = "now";
  } else if (event.startsAtUtc) {
    const deltaMinutes = Math.round((startsAtMs - now.getTime()) / 60_000);
    if (deltaMinutes <= 60 && deltaMinutes >= 0) {
      urgencyState = "next";
    } else if (deltaMinutes < 0 && event.endsAtUtc && new Date(event.endsAtUtc).getTime() > now.getTime()) {
      urgencyState = "now";
    } else if (deltaMinutes <= 180) {
      urgencyState = "soon";
    }
  }

  const googleSyncLabel = event.isGoogleMirrorEnabled
    ? event.googleSyncStatus === "Failed"
      ? "Sync needs attention"
      : event.googleSyncStatus === "Pending"
        ? "Sync pending"
        : "Mirrored to Google"
    : null;

  const detailLabel = event.isImported
    ? "Imported events stay visible here and remain read-only."
    : event.isGoogleMirrorEnabled
      ? event.googleSyncStatus === "Failed"
        ? event.googleSyncError ?? "Google sync needs attention for this local event."
        : event.googleSyncStatus === "Pending"
          ? `This local event will sync to ${event.googleTargetDisplayName ?? "Google Calendar"} shortly.`
          : `This local event mirrors to ${event.googleTargetDisplayName ?? "Google Calendar"}.`
      : accessState === "editable"
        ? "Local events can be planned and edited from this calendar."
        : "Local events stay visible here while owner edits remain protected in this slice.";

  return {
    key: `event-${event.id}-${event.startsAtUtc ?? "none"}`,
    id: event.id,
    title: event.title,
    description: event.description,
    ownerDisplay: {
      label: "Household",
      kind: "household"
    },
    kind: "event",
    sourceLabel: event.isImported ? "imported" : "local",
    urgencyState,
    accessState,
    startsAtUtc: event.startsAtUtc,
    endsAtUtc: event.endsAtUtc,
    isAllDay: event.isAllDay,
    isImported: event.isImported,
    sourceKind: event.sourceKind,
    timeLabel: formatTimeRange({
      isAllDay: event.isAllDay,
      startsAtUtc: event.startsAtUtc,
      endsAtUtc: event.endsAtUtc
    }),
    detailLabel,
    recurrenceSummary: seriesItem?.recurrenceSummary ?? null,
    isGoogleMirrorEnabled: event.isGoogleMirrorEnabled,
    googleSyncStatus: event.googleSyncStatus,
    googleSyncError: event.googleSyncError,
    googleTargetDisplayName: event.googleTargetDisplayName,
    lastGoogleSyncSucceededAtUtc: event.lastGoogleSyncSucceededAtUtc,
    googleSyncLabel
  };
}

export function buildCalendarReminderItem(
  reminder: EventReminderItem,
  isOwner: boolean,
  now = new Date()
): CalendarReminderItem {
  return {
    key: `reminder-${reminder.id}`,
    id: reminder.id,
    scheduledEventId: reminder.scheduledEventId,
    title: reminder.eventTitle,
    description: null,
    ownerDisplay: {
      label: "Household",
      kind: "household"
    },
    kind: "reminder",
    sourceLabel: "household",
    urgencyState: getReminderUrgencyState({ dueAtUtc: reminder.dueAtUtc }, now),
    accessState: isOwner ? "editable" : "read-only",
    dueAtUtc: reminder.dueAtUtc,
    minutesBefore: reminder.minutesBefore,
    status: reminder.status,
    firedAtUtc: reminder.firedAtUtc,
    dueLabel: formatReminderDueLabel(reminder.dueAtUtc),
    detailLabel: `${reminder.minutesBefore} min before`,
  };
}

function sortCalendarDayEntries(left: CalendarDayEntry, right: CalendarDayEntry) {
  const leftTime = left.kind === "event"
    ? new Date(left.startsAtUtc ?? "9999-12-31T00:00:00.000Z").getTime()
    : new Date(left.dueAtUtc).getTime();
  const rightTime = right.kind === "event"
    ? new Date(right.startsAtUtc ?? "9999-12-31T00:00:00.000Z").getTime()
    : new Date(right.dueAtUtc).getTime();

  return leftTime - rightTime;
}

function buildEntriesByDate(items: CalendarDayEntry[]) {
  const entriesByDate = new Map<string, CalendarDayEntry[]>();

  for (const item of items) {
    const date = item.kind === "event"
      ? dateKeyFromUtc(item.startsAtUtc)
      : dateKeyFromUtc(item.dueAtUtc);

    if (!date) {
      continue;
    }

    const existing = entriesByDate.get(date) ?? [];
    existing.push(item);
    entriesByDate.set(date, existing);
  }

  return entriesByDate;
}

function buildCalendarDayGroup(
  date: string,
  entriesByDate: Map<string, CalendarDayEntry[]>,
  now = new Date()
): CalendarDayGroup {
  const items = [...(entriesByDate.get(date) ?? [])].sort(sortCalendarDayEntries);
  const eventCount = items.filter((item) => item.kind === "event").length;
  const reminderCount = items.filter((item) => item.kind === "reminder").length;

  return {
    date,
    label: formatDayLabel(date),
    shortLabel: new Date(`${date}T00:00:00Z`).toLocaleDateString([], {
      weekday: "short"
    }),
    isToday: dateKeyFromUtc(now.toISOString()) === date,
    items,
    busyLabel: getCalendarBusyLabel(items.length),
    eventCount,
    reminderCount
  };
}

function getIndicatorTone(item: CalendarDayEntry): CalendarMonthIndicatorTone {
  if (item.kind === "reminder") {
    return "reminder";
  }

  return item.isImported ? "imported" : "local";
}

function buildMonthIndicatorSummary(items: CalendarDayEntry[]) {
  const counts = new Map<CalendarMonthIndicatorTone, number>([
    ["reminder", 0],
    ["local", 0],
    ["imported", 0]
  ]);

  for (const item of items) {
    const tone = getIndicatorTone(item);
    counts.set(tone, (counts.get(tone) ?? 0) + 1);
  }

  const tones: CalendarMonthIndicatorTone[] = [];
  const order: CalendarMonthIndicatorTone[] = ["reminder", "local", "imported"];

  for (const tone of order) {
    if ((counts.get(tone) ?? 0) > 0) {
      tones.push(tone);
    }
  }

  while (tones.length < 3 && tones.length < items.length) {
    for (const tone of order) {
      const totalForTone = counts.get(tone) ?? 0;
      const currentForTone = tones.filter((value) => value === tone).length;
      if (totalForTone > currentForTone && tones.length < 3) {
        tones.push(tone);
      }
    }
  }

  return {
    indicatorTones: tones,
    overflowCount: Math.max(items.length - tones.length, 0)
  };
}

function buildMonthDay(
  date: string,
  entriesByDate: Map<string, CalendarDayEntry[]>,
  visibleMonthStartUtc: string,
  selectedDate: string,
  now = new Date()
): CalendarMonthDay {
  const dayGroup = buildCalendarDayGroup(date, entriesByDate, now);
  const indicatorSummary = buildMonthIndicatorSummary(dayGroup.items);

  return {
    date,
    dayNumber: new Date(`${date}T00:00:00Z`).getUTCDate().toString(),
    isCurrentMonth: date.startsWith(visibleMonthStartUtc.slice(0, 7)),
    isToday: dayGroup.isToday,
    isSelected: date === selectedDate,
    items: dayGroup.items,
    busyLabel: dayGroup.busyLabel,
    eventCount: dayGroup.eventCount,
    reminderCount: dayGroup.reminderCount,
    indicatorTones: indicatorSummary.indicatorTones,
    overflowCount: indicatorSummary.overflowCount
  };
}

export function buildFamilyCalendarViewModel({
  weekAgenda,
  monthAgenda,
  reminders,
  home,
  seriesItems,
  isOwner,
  visibleMonthStartUtc,
  selectedDate,
  now = new Date()
}: BuildFamilyCalendarViewModelArgs): FamilyCalendarViewModel {
  const weekStartUtc = weekAgenda?.windowStartUtc ?? getWeekStartUtc(now);
  const weekEndUtc = weekAgenda?.windowEndUtc ?? addDaysUtc(weekStartUtc, 7);
  const seriesById = new Map(seriesItems.map((item) => [item.id, item]));
  const weekEvents = (weekAgenda?.items ?? []).map((item) =>
    buildCalendarEventItem(item, seriesById.get(item.id) ?? null, isOwner, now)
  );
  const monthEvents = (monthAgenda?.items ?? []).map((item) =>
    buildCalendarEventItem(item, seriesById.get(item.id) ?? null, isOwner, now)
  );
  const reminderItems = reminders
    .filter((item) => item.status !== "Dismissed")
    .map((item) => buildCalendarReminderItem(item, isOwner, now));
  const weekEntriesByDate = buildEntriesByDate([...weekEvents, ...reminderItems]);
  const visibleMonth = visibleMonthStartUtc ?? getMonthStartUtc(now);
  const resolvedSelectedDate = selectedDate ?? getDefaultSelectedDateForMonth(visibleMonth, now);
  const monthEntriesByDate = buildEntriesByDate([...monthEvents, ...reminderItems]);

  const days: CalendarDayGroup[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysUtc(weekStartUtc, index).slice(0, 10);
    return buildCalendarDayGroup(date, weekEntriesByDate, now);
  });

  const monthGridStartUtc = monthAgenda?.windowStartUtc ?? getMonthGridStartUtc(visibleMonth);
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = addDaysUtc(monthGridStartUtc, index).slice(0, 10);
    return buildMonthDay(
      date,
      monthEntriesByDate,
      visibleMonth,
      resolvedSelectedDate,
      now
    );
  });
  const selectedDayGroup = buildCalendarDayGroup(
    resolvedSelectedDate,
    monthEntriesByDate,
    now
  );
  const todayDay = days.find((day) => day.isToday) ?? days[0];
  const nextEvent = weekEvents
    .filter((item) => item.startsAtUtc && new Date(item.startsAtUtc).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.startsAtUtc!).getTime() - new Date(right.startsAtUtc!).getTime())[0] ?? null;

  return {
    weekStartUtc,
    weekEndUtc,
    weekRangeLabel: getWeekRangeLabel(weekStartUtc, 7),
    totalEvents: weekEvents.length,
    importedCount: weekEvents.filter((item) => item.isImported).length,
    reminderCount: reminderItems.length,
    editableCount: weekEvents.filter((item) => item.accessState === "editable").length,
    days,
    focusSummary: {
      todayLabel: todayDay?.label ?? "Today",
      todayEventCount: todayDay?.eventCount ?? 0,
      todayReminderCount: todayDay?.reminderCount ?? 0,
      nextEvent,
      noteCount: home?.pinnedNotes.length ?? 0
    },
    mobileMonth: {
      monthStartUtc: visibleMonth,
      monthLabel: getMonthLabel(visibleMonth),
      weekdayHeaders: [...monthWeekdayHeaders],
      selectedDate: resolvedSelectedDate,
      days: monthDays,
      selectedDay: {
        ...selectedDayGroup,
        title: formatDayLabel(resolvedSelectedDate),
        fullLabel: formatSelectedDayLabel(resolvedSelectedDate),
        createLabel: formatMonthDayLabel(resolvedSelectedDate)
      }
    }
  };
}

export function joinRemindersToEventIds(reminders: EventReminderItem[]) {
  const remindersByEventId = new Map<string, EventReminderItem[]>();

  for (const reminder of reminders) {
    const existing = remindersByEventId.get(reminder.scheduledEventId) ?? [];
    existing.push(reminder);
    remindersByEventId.set(reminder.scheduledEventId, existing);
  }

  return remindersByEventId;
}

export function findScheduleItemOwnerDisplay() {
  return createOwnerDisplay("Household");
}
