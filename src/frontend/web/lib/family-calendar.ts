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
};

type BuildFamilyCalendarViewModelArgs = {
  agenda: UpcomingEventsResponse | null;
  reminders: EventReminderItem[];
  home: HomeResponse | null;
  seriesItems: ScheduledEventSeriesItem[];
  isOwner: boolean;
  now?: Date;
};

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
    detailLabel: event.isImported
      ? "Imported events stay visible here and remain read-only."
      : accessState === "editable"
        ? "Local events can be planned and edited from this calendar."
        : "Local events stay visible here while owner edits remain protected in this slice.",
    recurrenceSummary: seriesItem?.recurrenceSummary ?? null
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

export function buildFamilyCalendarViewModel({
  agenda,
  reminders,
  home,
  seriesItems,
  isOwner,
  now = new Date()
}: BuildFamilyCalendarViewModelArgs): FamilyCalendarViewModel {
  const weekStartUtc = agenda?.windowStartUtc ?? getWeekStartUtc(now);
  const weekEndUtc = agenda?.windowEndUtc ?? addDaysUtc(weekStartUtc, 7);
  const seriesById = new Map(seriesItems.map((item) => [item.id, item]));
  const events = (agenda?.items ?? []).map((item) =>
    buildCalendarEventItem(item, seriesById.get(item.id) ?? null, isOwner, now)
  );
  const reminderItems = reminders
    .filter((item) => item.status !== "Dismissed")
    .map((item) => buildCalendarReminderItem(item, isOwner, now));

  const days: CalendarDayGroup[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysUtc(weekStartUtc, index).slice(0, 10);
    const dayEvents = events.filter((item) => dateKeyFromUtc(item.startsAtUtc) === date);
    const dayReminders = reminderItems.filter((item) => dateKeyFromUtc(item.dueAtUtc) === date);
    const items = [...dayEvents, ...dayReminders].sort((left, right) => {
      const leftTime = left.kind === "event"
        ? new Date(left.startsAtUtc ?? weekStartUtc).getTime()
        : new Date(left.dueAtUtc).getTime();
      const rightTime = right.kind === "event"
        ? new Date(right.startsAtUtc ?? weekStartUtc).getTime()
        : new Date(right.dueAtUtc).getTime();

      return leftTime - rightTime;
    });
    const isToday = dateKeyFromUtc(now.toISOString()) === date;

    return {
      date,
      label: formatDayLabel(date),
      shortLabel: new Date(`${date}T00:00:00Z`).toLocaleDateString([], {
        weekday: "short"
      }),
      isToday,
      items,
      busyLabel: getCalendarBusyLabel(items.length),
      eventCount: dayEvents.length,
      reminderCount: dayReminders.length
    };
  });

  const todayDay = days.find((day) => day.isToday) ?? days[0];
  const nextEvent = events
    .filter((item) => item.startsAtUtc && new Date(item.startsAtUtc).getTime() >= now.getTime())
    .sort((left, right) => new Date(left.startsAtUtc!).getTime() - new Date(right.startsAtUtc!).getTime())[0] ?? null;

  return {
    weekStartUtc,
    weekEndUtc,
    weekRangeLabel: getWeekRangeLabel(weekStartUtc, 7),
    totalEvents: events.length,
    importedCount: events.filter((item) => item.isImported).length,
    reminderCount: reminderItems.length,
    editableCount: events.filter((item) => item.accessState === "editable").length,
    days,
    focusSummary: {
      todayLabel: todayDay?.label ?? "Today",
      todayEventCount: todayDay?.eventCount ?? 0,
      todayReminderCount: todayDay?.reminderCount ?? 0,
      nextEvent,
      noteCount: home?.pinnedNotes.length ?? 0
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
