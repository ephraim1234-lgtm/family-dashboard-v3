import {
  createOwnerDisplay,
  type FamilyOwnerDisplay,
  type FamilySourceLabel,
  getSourceLabel
} from "@/lib/family-command-center";

export type RecurrencePattern = "None" | "Daily" | "Weekly";

export type UpcomingEventItem = {
  id: string;
  title: string;
  description: string | null;
  isAllDay: boolean;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isImported: boolean;
  sourceKind: string | null;
};

export type UpcomingEventsResponse = {
  windowStartUtc: string;
  windowEndUtc: string;
  items: UpcomingEventItem[];
};

export type ScheduledEventSeriesItem = {
  id: string;
  title: string;
  description: string | null;
  isAllDay: boolean;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceSummary: string;
  weeklyDays: string[];
  recursUntilUtc: string | null;
  isImported: boolean;
  sourceKind: string | null;
  nextOccurrenceStartsAtUtc: string | null;
  createdAtUtc: string;
};

export type ScheduledEventSeriesListResponse = {
  items: ScheduledEventSeriesItem[];
};

export type EventReminderItem = {
  id: string;
  scheduledEventId: string;
  eventTitle: string;
  minutesBefore: number;
  dueAtUtc: string;
  status: string;
  firedAtUtc: string | null;
  createdAtUtc: string;
};

export type EventReminderListResponse = {
  items: EventReminderItem[];
};

export type SchedulingEditorState = {
  title: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  isAllDay: boolean;
  recurrencePattern: RecurrencePattern;
  weeklyDays: string[];
  recursUntilLocal: string;
};

export type SchedulingEditorSummary = {
  timingSummary: string;
  recurrenceSummary: string;
};

export const weekdayOptions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
] as const;

export const reminderPresetMinutes = [15, 30, 60, 1440] as const;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function createDefaultSchedulingEditorState(): SchedulingEditorState {
  return {
    title: "Morning routine",
    description: "Recurring household check-in",
    startsAtLocal: formatLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)),
    endsAtLocal: formatLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    isAllDay: false,
    recurrencePattern: "None",
    weeklyDays: ["Monday"],
    recursUntilLocal: ""
  };
}

export function createEmptySchedulingEditorState(): SchedulingEditorState {
  return {
    title: "",
    description: "",
    startsAtLocal: "",
    endsAtLocal: "",
    isAllDay: false,
    recurrencePattern: "None",
    weeklyDays: ["Monday"],
    recursUntilLocal: ""
  };
}

export function createSchedulingStateFromSeries(
  item: Pick<
    ScheduledEventSeriesItem,
    "title" | "description" | "startsAtUtc" | "endsAtUtc" | "isAllDay" | "recurrencePattern" | "weeklyDays" | "recursUntilUtc"
  >
): SchedulingEditorState {
  return {
    title: item.title,
    description: item.description ?? "",
    startsAtLocal: item.startsAtUtc ? formatLocalInputValue(new Date(item.startsAtUtc)) : "",
    endsAtLocal: item.endsAtUtc ? formatLocalInputValue(new Date(item.endsAtUtc)) : "",
    isAllDay: item.isAllDay,
    recurrencePattern: item.recurrencePattern,
    weeklyDays: item.weeklyDays,
    recursUntilLocal: item.recursUntilUtc
      ? formatLocalInputValue(new Date(item.recursUntilUtc))
      : ""
  };
}

export function createDraftFromSeries(
  item: Pick<
    ScheduledEventSeriesItem,
    "title" | "description" | "startsAtUtc" | "endsAtUtc" | "isAllDay" | "recurrencePattern" | "weeklyDays" | "recursUntilUtc"
  >
): SchedulingEditorState {
  return {
    ...createSchedulingStateFromSeries(item),
    title: `${item.title} copy`
  };
}

export function formatEventTime(
  item: Pick<UpcomingEventItem, "isAllDay" | "startsAtUtc" | "endsAtUtc">
) {
  if (item.isAllDay) {
    return "All day";
  }

  if (!item.startsAtUtc) {
    return "Unscheduled";
  }

  const starts = new Date(item.startsAtUtc).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  if (!item.endsAtUtc) {
    return starts;
  }

  const ends = new Date(item.endsAtUtc).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  return `${starts} - ${ends}`;
}

export function recurrenceBadge(
  item: Pick<ScheduledEventSeriesItem, "isRecurring" | "recurrencePattern">
) {
  if (!item.isRecurring || item.recurrencePattern === "None") {
    return "One-time";
  }

  return item.recurrencePattern;
}

export function sourceBadge(
  item: Pick<UpcomingEventItem, "isImported" | "sourceKind">
) {
  if (!item.isImported) {
    return "Local";
  }

  if (item.sourceKind === "GoogleCalendarIcs") {
    return "Imported from Google";
  }

  return "Imported";
}

export function sourceLabelFromItem(
  item: Pick<UpcomingEventItem, "isImported">
): FamilySourceLabel {
  return getSourceLabel(item.isImported);
}

export function ownerDisplayForScheduleItem(): FamilyOwnerDisplay {
  return {
    label: "Household",
    kind: "household"
  };
}

export function relativeDayLabel(date: string) {
  const target = new Date(`${date}T00:00:00Z`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const differenceInDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (differenceInDays === 0) {
    return "Today";
  }

  if (differenceInDays === 1) {
    return "Tomorrow";
  }

  if (differenceInDays === -1) {
    return "Yesterday";
  }

  return null;
}

export function getCurrentWindowStartIso() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

export function normalizeUtcDayStart(value: string) {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  ).toISOString();
}

export function addUtcDays(startUtc: string, days: number) {
  const date = new Date(startUtc);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

export function isSameUtcDay(left: string, right: string) {
  return normalizeUtcDayStart(left) === normalizeUtcDayStart(right);
}

export function framePositionLabel(startUtc: string) {
  const todayStartUtc = getCurrentWindowStartIso();

  if (isSameUtcDay(startUtc, todayStartUtc)) {
    return "Current frame";
  }

  return startUtc < todayStartUtc ? "Past frame" : "Future frame";
}

export function formatFrameRange(startUtc: string, endUtc: string) {
  return `${new Date(startUtc).toLocaleDateString()} - ${new Date(endUtc).toLocaleDateString()}`;
}

export function formatSeriesDateTime(value: string | null, isAllDay: boolean) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: isAllDay ? undefined : "numeric",
    minute: isAllDay ? undefined : "2-digit"
  });
}

export function recurrenceEditorSummary(
  recurrencePattern: RecurrencePattern,
  weeklyDays: string[],
  recursUntilLocal: string,
  isAllDay: boolean
) {
  if (recurrencePattern === "None") {
    return "One-time event";
  }

  const recurrenceLabel = recurrencePattern === "Daily"
    ? "Repeats daily"
    : `Repeats weekly on ${weeklyDays.length > 0 ? weeklyDays.join(", ") : "selected weekdays"}`;

  if (!recursUntilLocal) {
    return recurrenceLabel;
  }

  return `${recurrenceLabel} until ${formatSeriesDateTime(recursUntilLocal, isAllDay)}`;
}

export function deriveWeeklyDayFromStart(startsAtLocal: string) {
  if (!startsAtLocal) {
    return null;
  }

  const dayIndex = new Date(startsAtLocal).getDay();
  const weekdayByIndex = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ] as const;

  return weekdayByIndex[dayIndex] ?? null;
}

export function addLocalDays(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return formatLocalInputValue(date);
}

export function getSeriesValidationIssues(input: {
  title: string;
  startsAtLocal: string;
  endsAtLocal: string;
  recurrencePattern: RecurrencePattern;
  weeklyDays: string[];
  recursUntilLocal: string;
}) {
  const issues: string[] = [];

  if (!input.title.trim()) {
    issues.push("Title is required.");
  }

  if (!input.startsAtLocal) {
    issues.push("Start date and time are required.");
  }

  if (input.startsAtLocal && input.endsAtLocal) {
    const startsAt = new Date(input.startsAtLocal);
    const endsAt = new Date(input.endsAtLocal);

    if (endsAt <= startsAt) {
      issues.push("End must be after the start.");
    }
  }

  if (input.recurrencePattern === "Weekly" && input.weeklyDays.length === 0) {
    issues.push("Weekly recurrence needs at least one weekday.");
  }

  if (input.startsAtLocal && input.recursUntilLocal) {
    const startsAt = new Date(input.startsAtLocal);
    const recursUntil = new Date(input.recursUntilLocal);

    if (recursUntil < startsAt) {
      issues.push("Repeat until must be on or after the first start.");
    }
  }

  return issues;
}

export function buildSeriesEditorSummary(
  state: SchedulingEditorState
): SchedulingEditorSummary {
  const timingSummary = state.isAllDay
    ? `All day on ${formatSeriesDateTime(state.startsAtLocal || null, true)}`
    : `${formatSeriesDateTime(state.startsAtLocal || null, false)}${state.endsAtLocal ? ` to ${formatSeriesDateTime(state.endsAtLocal, false)}` : ""}`;

  return {
    timingSummary,
    recurrenceSummary: recurrenceEditorSummary(
      state.recurrencePattern,
      state.weeklyDays,
      state.recursUntilLocal,
      state.isAllDay
    )
  };
}

export function applySuggestedSeriesEnd(startsAtLocal: string, durationMinutes: number) {
  if (!startsAtLocal) {
    return "";
  }

  const date = new Date(startsAtLocal);
  date.setMinutes(date.getMinutes() + durationMinutes);
  return formatLocalInputValue(date);
}

export function formatReminderLeadTime(minutesBefore: number) {
  if (minutesBefore < 60) {
    return `${minutesBefore} min before`;
  }

  if (minutesBefore === 60) {
    return "1 hr before";
  }

  if (minutesBefore % 60 === 0) {
    return `${minutesBefore / 60} hr before`;
  }

  return `${minutesBefore} min before`;
}

export function reminderStatusSummary(reminder: EventReminderItem, now = new Date()) {
  const dueMs = new Date(reminder.dueAtUtc).getTime();
  const deltaMinutes = Math.round((dueMs - now.getTime()) / 60_000);

  if (reminder.status === "Fired") {
    return "Fired";
  }

  if (reminder.status === "Dismissed") {
    return "Dismissed";
  }

  if (deltaMinutes < 0) {
    const overdueMinutes = Math.abs(deltaMinutes);
    if (overdueMinutes < 60) {
      return `Overdue by ${overdueMinutes} min`;
    }

    if (overdueMinutes % 60 === 0) {
      return `Overdue by ${overdueMinutes / 60} hr`;
    }

    return `Overdue by ${overdueMinutes} min`;
  }

  if (deltaMinutes < 60) {
    return `Due in ${deltaMinutes} min`;
  }

  if (deltaMinutes % 60 === 0) {
    return `Due in ${deltaMinutes / 60} hr`;
  }

  return `Due in ${deltaMinutes} min`;
}

export function createUnassignedOwnerDisplay(memberName?: string | null) {
  return createOwnerDisplay(memberName);
}
