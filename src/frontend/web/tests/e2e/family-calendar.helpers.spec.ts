import { expect, test } from "@playwright/test";
import { createMemberEventDraftForDate } from "../../components/member-event-draft";
import {
  buildFamilyCalendarViewModel,
  getCalendarAccessState,
  getMonthGridStartUtc,
  getMonthStartUtc,
  getWeekStartUtc,
  joinRemindersToEventIds
} from "../../lib/family-calendar";
import type { HomeResponse } from "../../lib/family-command-center";
import type {
  EventReminderItem,
  ScheduledEventSeriesItem,
  UpcomingEventsResponse
} from "../../components/scheduling";

function buildHomeResponse(overrides: Partial<HomeResponse> = {}): HomeResponse {
  return {
    todayEvents: [],
    todayChores: [],
    pinnedNotes: [],
    recentActivity: [],
    upcomingDays: [],
    pendingReminders: [],
    memberChoreProgress: [],
    upcomingEventCount: 0,
    pendingReminderCount: 0,
    ...overrides
  };
}

function buildWeekAgendaResponse(): UpcomingEventsResponse {
  return {
    windowStartUtc: "2026-04-20T00:00:00.000Z",
    windowEndUtc: "2026-04-27T00:00:00.000Z",
    items: [
      {
        id: "evt-local",
        title: "Morning dropoff",
        description: "Bring the science project.",
        isAllDay: false,
        startsAtUtc: "2026-04-20T14:30:00.000Z",
        endsAtUtc: "2026-04-20T15:00:00.000Z",
        isImported: false,
        sourceKind: null,
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null
      },
      {
        id: "evt-imported-late",
        title: "Soccer practice",
        description: null,
        isAllDay: false,
        startsAtUtc: "2026-04-22T23:00:00.000Z",
        endsAtUtc: "2026-04-23T00:00:00.000Z",
        isImported: true,
        sourceKind: "GoogleCalendarIcs",
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null
      }
    ]
  };
}

function buildMonthAgendaResponse(): UpcomingEventsResponse {
  return {
    windowStartUtc: "2026-03-30T00:00:00.000Z",
    windowEndUtc: "2026-05-11T00:00:00.000Z",
    items: [
      {
        id: "evt-local",
        title: "Morning dropoff",
        description: "Bring the science project.",
        isAllDay: false,
        startsAtUtc: "2026-04-20T14:30:00.000Z",
        endsAtUtc: "2026-04-20T15:00:00.000Z",
        isImported: false,
        sourceKind: null,
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null
      },
      {
        id: "evt-imported-same-day",
        title: "Camp carpool",
        description: null,
        isAllDay: false,
        startsAtUtc: "2026-04-20T18:00:00.000Z",
        endsAtUtc: "2026-04-20T18:30:00.000Z",
        isImported: true,
        sourceKind: "GoogleCalendarIcs",
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null
      },
      {
        id: "evt-imported-late",
        title: "Soccer practice",
        description: null,
        isAllDay: false,
        startsAtUtc: "2026-04-22T23:00:00.000Z",
        endsAtUtc: "2026-04-23T00:00:00.000Z",
        isImported: true,
        sourceKind: "GoogleCalendarIcs",
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null
      }
    ]
  };
}

function buildReminders(): EventReminderItem[] {
  return [
    {
      id: "rem-1",
      scheduledEventId: "evt-local",
      eventTitle: "Morning dropoff",
      minutesBefore: 20,
      dueAtUtc: "2026-04-20T14:10:00.000Z",
      status: "Pending",
      firedAtUtc: null,
      createdAtUtc: "2026-04-20T12:00:00.000Z"
    }
  ];
}

function buildSeries(): ScheduledEventSeriesItem[] {
  return [
    {
      id: "evt-local",
      title: "Morning dropoff",
      description: "Bring the science project.",
      isAllDay: false,
      startsAtUtc: "2026-04-20T14:30:00.000Z",
      endsAtUtc: "2026-04-20T15:00:00.000Z",
      isRecurring: true,
      recurrencePattern: "Weekly",
      recurrenceSummary: "Weekly on Monday",
      weeklyDays: ["Monday"],
      recursUntilUtc: null,
      isImported: false,
      sourceKind: null,
      isGoogleMirrorEnabled: false,
      googleSyncStatus: null,
      googleSyncError: null,
      googleTargetDisplayName: null,
      lastGoogleSyncSucceededAtUtc: null,
      nextOccurrenceStartsAtUtc: "2026-04-20T14:30:00.000Z",
      createdAtUtc: "2026-04-01T10:00:00.000Z"
    }
  ];
}

test("derives week windows from an anchor date", () => {
  expect(getWeekStartUtc(new Date("2026-04-23T18:00:00.000Z"))).toBe("2026-04-20T00:00:00.000Z");
});

test("derives month anchors and six-week grid starts", () => {
  expect(getMonthStartUtc(new Date("2026-04-23T18:00:00.000Z"))).toBe("2026-04-01T00:00:00.000Z");
  expect(getMonthGridStartUtc("2026-04-01T00:00:00.000Z")).toBe("2026-03-30T00:00:00.000Z");
});

test("joins reminders to owning event ids", () => {
  const joined = joinRemindersToEventIds(buildReminders());
  expect(joined.get("evt-local")).toHaveLength(1);
  expect(joined.get("evt-local")?.[0]?.eventTitle).toBe("Morning dropoff");
});

test("builds week and mobile month calendar models from the shared normalized data", () => {
  const now = new Date("2026-04-20T14:00:00.000Z");
  const viewModel = buildFamilyCalendarViewModel({
    weekAgenda: buildWeekAgendaResponse(),
    monthAgenda: buildMonthAgendaResponse(),
    reminders: buildReminders(),
    home: buildHomeResponse({
      pinnedNotes: [
        {
          id: "note-1",
          title: "Dinner prep",
          body: "Defrost the chicken.",
          authorDisplayName: "Morgan"
        }
      ]
    }),
    seriesItems: buildSeries(),
    isOwner: true,
    visibleMonthStartUtc: "2026-04-01T00:00:00.000Z",
    selectedDate: "2026-04-20",
    now
  });

  expect(viewModel.weekRangeLabel).toContain("Apr");
  expect(viewModel.totalEvents).toBe(2);
  expect(viewModel.importedCount).toBe(1);
  expect(viewModel.reminderCount).toBe(1);
  expect(viewModel.editableCount).toBe(1);
  expect(viewModel.days[0]?.items.some((item) => item.title === "Morning dropoff")).toBeTruthy();
  expect(viewModel.days[0]?.items.some((item) => item.kind === "reminder")).toBeTruthy();
  expect(viewModel.mobileMonth.days).toHaveLength(42);
  expect(viewModel.mobileMonth.days[0]?.date).toBe("2026-03-30");

  const selectedMonthDay = viewModel.mobileMonth.days.find((day) => day.date === "2026-04-20");
  expect(selectedMonthDay?.indicatorTones).toEqual(["reminder", "local", "imported"]);
  expect(selectedMonthDay?.overflowCount).toBe(0);
  expect(viewModel.mobileMonth.selectedDay.createLabel).toBe("Apr 20");
  expect(viewModel.mobileMonth.selectedDay.items).toHaveLength(3);
  expect(viewModel.mobileMonth.selectedDay.items[1]?.sourceLabel).toBe("local");
});

test("keeps imported events read-only inside the mobile selected-day data", () => {
  const viewModel = buildFamilyCalendarViewModel({
    weekAgenda: buildWeekAgendaResponse(),
    monthAgenda: buildMonthAgendaResponse(),
    reminders: buildReminders(),
    home: buildHomeResponse(),
    seriesItems: buildSeries(),
    isOwner: true,
    visibleMonthStartUtc: "2026-04-01T00:00:00.000Z",
    selectedDate: "2026-04-22",
    now: new Date("2026-04-20T14:00:00.000Z")
  });

  expect(viewModel.mobileMonth.selectedDay.items[0]?.kind).toBe("event");
  expect(viewModel.mobileMonth.selectedDay.items[0]?.sourceLabel).toBe("imported");
  expect(viewModel.mobileMonth.selectedDay.items[0]?.accessState).toBe("read-only");
});

test("creates selected-date drafts that keep the chosen date in the existing event form", () => {
  const draft = createMemberEventDraftForDate("2026-04-24", new Date("2026-04-20T14:15:00.000Z"));

  expect(draft.allDayDate).toBe("2026-04-24");
  expect(draft.startsAtLocal.startsWith("2026-04-24T")).toBeTruthy();
  expect(draft.endsAtLocal.startsWith("2026-04-24T")).toBeTruthy();
});

test("derives owner editable vs read-only access state correctly", () => {
  expect(getCalendarAccessState(true, false)).toBe("editable");
  expect(getCalendarAccessState(true, true)).toBe("read-only");
  expect(getCalendarAccessState(false, false)).toBe("read-only");
});
