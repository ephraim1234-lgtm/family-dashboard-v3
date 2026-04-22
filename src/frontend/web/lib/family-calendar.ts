import type { HomeResponse } from "./family-command-center";
import {
  createOwnerDisplay,
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
export type CalendarDaySpanState = "single" | "start" | "middle" | "end";

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
  localStartDate: string | null;
  localEndDate: string | null;
  displayDate: string | null;
  spanState: CalendarDaySpanState;
  spanLabel: string | null;
  isReadOnly: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateReminder: boolean;
  canManageReminders: boolean;
  reminderEligibilityReason: string | null;
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
  isReadOnly: boolean;
  canDismiss: boolean;
  canSnooze: boolean;
  canDelete: boolean;
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

export type CalendarMonthEventTile = {
  key: string;
  tone: Exclude<CalendarMonthIndicatorTone, "reminder">;
  isStart: boolean;
  isEnd: boolean;
  title: string;
};

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
  eventTiles: CalendarMonthEventTile[];
  reminderDotCount: number;
};

export type CalendarSelectedDay = CalendarDayGroup & {
  title: string;
  fullLabel: string;
  createLabel: string;
};

export type FamilyCalendarViewModel = {
  householdTimeZoneId: string;
  weekStartDate: string;
  weekEndDate: string;
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
    monthStartDate: string;
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
  householdTimeZoneId?: string | null;
  visibleMonthStartDate?: string;
  selectedDate?: string | null;
  weekStartDate?: string;
  now?: Date;
};

const DEFAULT_TIME_ZONE = "UTC";
const monthWeekdayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function formatInTimeZone(
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
}

function getDatePartsInTimeZone(value: string | Date, timeZone: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? "0", 10);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second")
  };
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function formatDateKeyFromCalendarDate(date: Date) {
  return formatDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

export function getDateKeyInTimeZone(value: string | Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = getDatePartsInTimeZone(value, timeZone);
  return formatDateKey(parts.year, parts.month, parts.day);
}

function createCalendarDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`);
}

function formatCalendarDate(
  dateKey: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    ...options
  }).format(createCalendarDate(dateKey));
}

export function addCalendarDays(startDate: string, days: number) {
  const date = createCalendarDate(startDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKeyFromCalendarDate(date);
}

export function addCalendarMonths(monthStartDate: string, months: number) {
  const date = createCalendarDate(monthStartDate);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatDateKeyFromCalendarDate(date);
}

export function getWeekStartDate(anchor = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const date = createCalendarDate(getDateKeyInTimeZone(anchor, timeZone));
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDateKeyFromCalendarDate(date);
}

export function getMonthStartDate(anchor = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const date = createCalendarDate(getDateKeyInTimeZone(anchor, timeZone));
  date.setUTCDate(1);
  return formatDateKeyFromCalendarDate(date);
}

export function getMonthGridStartDate(monthStartDate: string) {
  const date = createCalendarDate(monthStartDate);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDateKeyFromCalendarDate(date);
}

export function getMonthLabel(monthStartDate: string) {
  return formatCalendarDate(monthStartDate, {
    month: "long",
    year: "numeric"
  });
}

export function getWeekRangeLabel(weekStartDate: string, days: number) {
  const weekEndDate = addCalendarDays(weekStartDate, days - 1);
  const startLabel = formatCalendarDate(weekStartDate, {
    month: "short",
    day: "numeric"
  });
  const endLabel = formatCalendarDate(weekEndDate, {
    month: "short",
    day: "numeric"
  });
  const startYear = createCalendarDate(weekStartDate).getUTCFullYear();
  const endYear = createCalendarDate(weekEndDate).getUTCFullYear();

  if (startYear === endYear) {
    return `${startLabel} - ${endLabel}, ${startYear}`;
  }

  return `${startLabel}, ${startYear} - ${endLabel}, ${endYear}`;
}

function isSameVisibleMonth(leftDate: string, rightDate: string) {
  return leftDate.slice(0, 7) === rightDate.slice(0, 7);
}

function formatMonthDayLabel(date: string) {
  return formatCalendarDate(date, {
    month: "short",
    day: "numeric"
  });
}

function formatSelectedDayLabel(date: string) {
  return formatCalendarDate(date, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

export function getDefaultSelectedDateForMonth(
  visibleMonthStartDate: string,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE
) {
  const todayDate = getDateKeyInTimeZone(now, timeZone);

  if (isSameVisibleMonth(visibleMonthStartDate, todayDate)) {
    return todayDate;
  }

  return visibleMonthStartDate;
}

export function getUtcStartOfLocalDate(
  dateKey: string,
  timeZone = DEFAULT_TIME_ZONE
) {
  const [yearString, monthString, dayString] = dateKey.split("-");
  const year = Number.parseInt(yearString ?? "0", 10);
  const month = Number.parseInt(monthString ?? "1", 10);
  const day = Number.parseInt(dayString ?? "1", 10);
  const desiredUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = desiredUtc;

  for (let index = 0; index < 3; index += 1) {
    const parts = getDatePartsInTimeZone(new Date(guess), timeZone);
    const actualUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    guess += desiredUtc - actualUtc;
  }

  return new Date(guess).toISOString();
}

export function getCalendarAccessState(item: Pick<UpcomingEventItem, "canEdit">): CalendarAccessState {
  return item.canEdit ? "editable" : "read-only";
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

function formatEventTimeRange(
  item: Pick<UpcomingEventItem, "isAllDay" | "startsAtUtc" | "endsAtUtc">,
  timeZone: string
) {
  if (item.isAllDay) {
    return "All day";
  }

  if (!item.startsAtUtc) {
    return "Unscheduled";
  }

  const start = formatInTimeZone(item.startsAtUtc, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  });

  if (!item.endsAtUtc) {
    return start;
  }

  return `${start} - ${formatInTimeZone(item.endsAtUtc, timeZone, {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function formatReminderDueLabelInTimeZone(dueAtUtc: string, timeZone: string) {
  return formatInTimeZone(dueAtUtc, timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDayLabel(date: string, timeZone: string, now = new Date()) {
  const today = getDateKeyInTimeZone(now, timeZone);
  const tomorrow = addCalendarDays(today, 1);

  if (date === today) {
    return "Today";
  }

  if (date === tomorrow) {
    return "Tomorrow";
  }

  return formatCalendarDate(date, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatWeekdayShort(date: string, timeZone: string, now = new Date()) {
  if (date === getDateKeyInTimeZone(now, timeZone)) {
    return "Today";
  }

  return formatCalendarDate(date, {
    weekday: "short"
  });
}

function buildEventSpanLabel(item: CalendarEventItem) {
  if (!item.localStartDate || !item.localEndDate || item.localStartDate === item.localEndDate) {
    return null;
  }

  switch (item.spanState) {
    case "start":
      return `Continues through ${formatMonthDayLabel(item.localEndDate)}`;
    case "middle":
      return `Continues from ${formatMonthDayLabel(item.localStartDate)}`;
    case "end":
      return `Ends today`;
    default:
      return null;
  }
}

export function buildCalendarEventItem(
  event: UpcomingEventItem,
  seriesItem: ScheduledEventSeriesItem | null,
  _isOwner: boolean,
  timeZone = DEFAULT_TIME_ZONE,
  now = new Date()
): CalendarEventItem {
  const accessState = getCalendarAccessState(event);
  const startsAtMs = event.startsAtUtc
    ? new Date(event.startsAtUtc).getTime()
    : Number.POSITIVE_INFINITY;
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

  const localStartDate = event.startsAtUtc
    ? getDateKeyInTimeZone(event.startsAtUtc, timeZone)
    : null;
  const inclusiveEndSource = event.endsAtUtc
    ? new Date(Math.max(new Date(event.endsAtUtc).getTime() - 1, startsAtMs))
    : (event.startsAtUtc ? new Date(event.startsAtUtc) : null);
  const localEndDate = inclusiveEndSource
    ? getDateKeyInTimeZone(inclusiveEndSource, timeZone)
    : localStartDate;

  const baseItem: CalendarEventItem = {
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
    timeLabel: formatEventTimeRange(event, timeZone),
    detailLabel,
    recurrenceSummary: seriesItem?.recurrenceSummary ?? null,
    isGoogleMirrorEnabled: event.isGoogleMirrorEnabled,
    googleSyncStatus: event.googleSyncStatus,
    googleSyncError: event.googleSyncError,
    googleTargetDisplayName: event.googleTargetDisplayName,
    lastGoogleSyncSucceededAtUtc: event.lastGoogleSyncSucceededAtUtc,
    googleSyncLabel,
    localStartDate,
    localEndDate,
    displayDate: localStartDate,
    spanState: localStartDate && localEndDate && localStartDate !== localEndDate ? "start" : "single",
    spanLabel: null,
    isReadOnly: event.isReadOnly,
    canEdit: event.canEdit,
    canDelete: event.canDelete,
    canCreateReminder: event.canCreateReminder,
    canManageReminders: event.canManageReminders,
    reminderEligibilityReason: event.reminderEligibilityReason
  };

  return {
    ...baseItem,
    spanLabel: buildEventSpanLabel(baseItem)
  };
}

export function buildCalendarReminderItem(
  reminder: EventReminderItem,
  _isOwner: boolean,
  timeZone = DEFAULT_TIME_ZONE,
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
    accessState: reminder.isReadOnly ? "read-only" : "editable",
    dueAtUtc: reminder.dueAtUtc,
    minutesBefore: reminder.minutesBefore,
    status: reminder.status,
    firedAtUtc: reminder.firedAtUtc,
    dueLabel: formatReminderDueLabelInTimeZone(reminder.dueAtUtc, timeZone),
    detailLabel: `${reminder.minutesBefore} min before`,
    isReadOnly: reminder.isReadOnly,
    canDismiss: reminder.canDismiss,
    canSnooze: reminder.canSnooze,
    canDelete: reminder.canDelete
  };
}

function sortCalendarDayEntries(left: CalendarDayEntry, right: CalendarDayEntry) {
  const leftTime = left.kind === "event"
    ? new Date(left.startsAtUtc ?? "9999-12-31T00:00:00.000Z").getTime()
    : new Date(left.dueAtUtc).getTime();
  const rightTime = right.kind === "event"
    ? new Date(right.startsAtUtc ?? "9999-12-31T00:00:00.000Z").getTime()
    : new Date(right.dueAtUtc).getTime();

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  if (left.kind === "event" && right.kind === "event") {
    const leftOrder = left.spanState === "start" || left.spanState === "single" ? 0 : 1;
    const rightOrder = right.spanState === "start" || right.spanState === "single" ? 0 : 1;
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title);
}

function expandEventEntries(items: CalendarEventItem[]) {
  const expanded: CalendarEventItem[] = [];

  for (const item of items) {
    if (!item.localStartDate) {
      continue;
    }

    const endDate = item.localEndDate ?? item.localStartDate;

    if (item.localStartDate === endDate) {
      expanded.push({
        ...item,
        displayDate: item.localStartDate,
        spanState: "single",
        spanLabel: null
      });
      continue;
    }

    let currentDate = item.localStartDate;

    while (currentDate <= endDate) {
      const spanState: CalendarDaySpanState =
        currentDate === item.localStartDate
          ? "start"
          : currentDate === endDate
            ? "end"
            : "middle";

      const nextItem: CalendarEventItem = {
        ...item,
        key: `${item.key}-${currentDate}`,
        displayDate: currentDate,
        spanState
      };

      nextItem.spanLabel = buildEventSpanLabel(nextItem);
      expanded.push(nextItem);
      currentDate = addCalendarDays(currentDate, 1);
    }
  }

  return expanded;
}

function buildEntriesByDate(
  items: CalendarDayEntry[],
  timeZone: string
) {
  const entriesByDate = new Map<string, CalendarDayEntry[]>();
  const eventEntries = expandEventEntries(items.filter((item): item is CalendarEventItem => item.kind === "event"));
  const reminderEntries = items.filter((item): item is CalendarReminderItem => item.kind === "reminder");

  for (const item of eventEntries) {
    const date = item.displayDate;

    if (!date) {
      continue;
    }

    const existing = entriesByDate.get(date) ?? [];
    existing.push(item);
    entriesByDate.set(date, existing);
  }

  for (const item of reminderEntries) {
    const date = getDateKeyInTimeZone(item.dueAtUtc, timeZone);
    const existing = entriesByDate.get(date) ?? [];
    existing.push(item);
    entriesByDate.set(date, existing);
  }

  return entriesByDate;
}

function buildCalendarDayGroup(
  date: string,
  entriesByDate: Map<string, CalendarDayEntry[]>,
  timeZone: string,
  now = new Date()
): CalendarDayGroup {
  const items = [...(entriesByDate.get(date) ?? [])].sort(sortCalendarDayEntries);
  const eventCount = items.filter((item) => item.kind === "event").length;
  const reminderCount = items.filter((item) => item.kind === "reminder").length;

  return {
    date,
    label: formatDayLabel(date, timeZone, now),
    shortLabel: formatWeekdayShort(date, timeZone, now),
    isToday: getDateKeyInTimeZone(now, timeZone) === date,
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

function buildMonthEventTiles(items: CalendarDayEntry[]) {
  return items
    .filter((item): item is CalendarEventItem => item.kind === "event")
    .slice(0, 2)
    .map((item) => {
      const tone: CalendarMonthEventTile["tone"] = item.isImported ? "imported" : "local";

      return {
        key: item.key,
        tone,
        isStart: item.spanState === "single" || item.spanState === "start",
        isEnd: item.spanState === "single" || item.spanState === "end",
        title: item.title
      };
    });
}

function buildMonthDay(
  date: string,
  entriesByDate: Map<string, CalendarDayEntry[]>,
  visibleMonthStartDate: string,
  selectedDate: string,
  timeZone: string,
  now = new Date()
): CalendarMonthDay {
  const dayGroup = buildCalendarDayGroup(date, entriesByDate, timeZone, now);
  const indicatorSummary = buildMonthIndicatorSummary(dayGroup.items);

  return {
    date,
    dayNumber: createCalendarDate(date).getUTCDate().toString(),
    isCurrentMonth: date.startsWith(visibleMonthStartDate.slice(0, 7)),
    isToday: dayGroup.isToday,
    isSelected: date === selectedDate,
    items: dayGroup.items,
    busyLabel: dayGroup.busyLabel,
    eventCount: dayGroup.eventCount,
    reminderCount: dayGroup.reminderCount,
    indicatorTones: indicatorSummary.indicatorTones,
    overflowCount: indicatorSummary.overflowCount,
    eventTiles: buildMonthEventTiles(dayGroup.items),
    reminderDotCount: dayGroup.items.filter((item) => item.kind === "reminder").length
  };
}

export function buildFamilyCalendarViewModel({
  weekAgenda,
  monthAgenda,
  reminders,
  home,
  seriesItems,
  isOwner,
  householdTimeZoneId,
  visibleMonthStartDate,
  selectedDate,
  weekStartDate,
  now = new Date()
}: BuildFamilyCalendarViewModelArgs): FamilyCalendarViewModel {
  const timeZone = householdTimeZoneId ?? DEFAULT_TIME_ZONE;
  const seriesById = new Map(seriesItems.map((item) => [item.id, item]));
  const weekEvents = (weekAgenda?.items ?? []).map((item) =>
    buildCalendarEventItem(item, seriesById.get(item.id) ?? null, isOwner, timeZone, now)
  );
  const monthEvents = (monthAgenda?.items ?? []).map((item) =>
    buildCalendarEventItem(item, seriesById.get(item.id) ?? null, isOwner, timeZone, now)
  );
  const reminderItems = reminders
    .filter((item) => item.status !== "Dismissed")
    .map((item) => buildCalendarReminderItem(item, isOwner, timeZone, now));
  const resolvedWeekStartDate = weekStartDate ?? getWeekStartDate(now, timeZone);
  const resolvedWeekEndDate = addCalendarDays(resolvedWeekStartDate, 6);
  const visibleMonth = visibleMonthStartDate ?? getMonthStartDate(now, timeZone);
  const resolvedSelectedDate = selectedDate ?? getDefaultSelectedDateForMonth(visibleMonth, now, timeZone);
  const weekEntriesByDate = buildEntriesByDate([...weekEvents, ...reminderItems], timeZone);
  const monthEntriesByDate = buildEntriesByDate([...monthEvents, ...reminderItems], timeZone);

  const days: CalendarDayGroup[] = Array.from({ length: 7 }, (_, index) => {
    const date = addCalendarDays(resolvedWeekStartDate, index);
    return buildCalendarDayGroup(date, weekEntriesByDate, timeZone, now);
  });

  const monthGridStartDate = getMonthGridStartDate(visibleMonth);
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = addCalendarDays(monthGridStartDate, index);
    return buildMonthDay(
      date,
      monthEntriesByDate,
      visibleMonth,
      resolvedSelectedDate,
      timeZone,
      now
    );
  });

  const selectedDayGroup = buildCalendarDayGroup(
    resolvedSelectedDate,
    monthEntriesByDate,
    timeZone,
    now
  );
  const todayDate = getDateKeyInTimeZone(now, timeZone);
  const todayDay = days.find((day) => day.date === todayDate) ?? buildCalendarDayGroup(
    todayDate,
    monthEntriesByDate,
    timeZone,
    now
  );
  const nextEvent = weekEvents
    .filter((item) => item.startsAtUtc && new Date(item.startsAtUtc).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.startsAtUtc!).getTime() - new Date(right.startsAtUtc!).getTime())[0] ?? null;

  return {
    householdTimeZoneId: timeZone,
    weekStartDate: resolvedWeekStartDate,
    weekEndDate: resolvedWeekEndDate,
    weekRangeLabel: getWeekRangeLabel(resolvedWeekStartDate, 7),
    totalEvents: weekEvents.length,
    importedCount: weekEvents.filter((item) => item.isImported).length,
    reminderCount: reminderItems.length,
    editableCount: weekEvents.filter((item) => item.accessState === "editable").length,
    days,
    focusSummary: {
      todayLabel: todayDay.label,
      todayEventCount: todayDay.eventCount,
      todayReminderCount: todayDay.reminderCount,
      nextEvent,
      noteCount: home?.pinnedNotes.length ?? 0
    },
    mobileMonth: {
      monthStartDate: visibleMonth,
      monthLabel: getMonthLabel(visibleMonth),
      weekdayHeaders: [...monthWeekdayHeaders],
      selectedDate: resolvedSelectedDate,
      days: monthDays,
      selectedDay: {
        ...selectedDayGroup,
        title: formatDayLabel(resolvedSelectedDate, timeZone, now),
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
