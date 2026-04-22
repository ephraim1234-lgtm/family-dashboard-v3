export type MemberEventDraftInput = {
  title: string;
  isAllDay: boolean;
  allDayDate: string;
  startsAtLocal: string;
  endsAtLocal: string;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatLocalDateTimeInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatLocalDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getNextRoundedHour(now = new Date()) {
  const rounded = new Date(now);
  rounded.setMinutes(0, 0, 0);
  rounded.setHours(rounded.getHours() + 1);
  return rounded;
}

function applyLocalDateToDateTime(localDate: string, localDateTime: string) {
  const time = localDateTime.split("T")[1] ?? "09:00";
  return `${localDate}T${time}`;
}

export function createDefaultMemberEventDraft(now = new Date()) {
  const startsAt = getNextRoundedHour(now);
  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + 1);

  return {
    title: "",
    description: "",
    isAllDay: false,
    allDayDate: formatLocalDateInputValue(startsAt),
    startsAtLocal: formatLocalDateTimeInputValue(startsAt),
    endsAtLocal: formatLocalDateTimeInputValue(endsAt)
  };
}

export function createMemberEventDraftForDate(
  localDate: string,
  now = new Date()
) {
  const draft = createDefaultMemberEventDraft(now);

  return {
    ...draft,
    allDayDate: localDate,
    startsAtLocal: applyLocalDateToDateTime(localDate, draft.startsAtLocal),
    endsAtLocal: applyLocalDateToDateTime(localDate, draft.endsAtLocal)
  };
}

export function getMemberEventValidationIssues(input: MemberEventDraftInput) {
  const issues: string[] = [];

  if (!input.title.trim()) {
    issues.push("Title is required.");
  }

  if (input.isAllDay) {
    if (!input.allDayDate) {
      issues.push("Choose a date for the all-day event.");
    }

    return issues;
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

  return issues;
}

export function buildMemberEventRequest(input: {
  title: string;
  description: string;
  isAllDay: boolean;
  allDayDate: string;
  startsAtLocal: string;
  endsAtLocal: string;
}) {
  const startsAtUtc = input.isAllDay
    ? (input.allDayDate ? new Date(`${input.allDayDate}T00:00`).toISOString() : null)
    : (input.startsAtLocal ? new Date(input.startsAtLocal).toISOString() : null);

  const endsAtUtc = input.isAllDay
    ? null
    : (input.endsAtLocal ? new Date(input.endsAtLocal).toISOString() : null);

  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
    isAllDay: input.isAllDay,
    startsAtUtc,
    endsAtUtc
  };
}

export function applySuggestedEnd(startsAtLocal: string, minutes: number) {
  if (!startsAtLocal) {
    return "";
  }

  const endsAt = new Date(startsAtLocal);
  endsAt.setMinutes(endsAt.getMinutes() + minutes);
  return formatLocalDateTimeInputValue(endsAt);
}
