import { expect, test } from "@playwright/test";
import { createMemberEventDraftForDate } from "../../components/member-event-draft";
import {
  buildFamilyCalendarViewModel,
  type CalendarEventItem,
  getCalendarAccessState,
  getMonthGridStartDate,
  getMonthStartDate,
  getUtcStartOfLocalDate,
  getWeekStartDate,
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
    windowStartUtc: "2026-04-20T05:00:00.000Z",
    windowEndUtc: "2026-04-27T05:00:00.000Z",
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
        lastGoogleSyncSucceededAtUtc: null,
        isReadOnly: false,
        canEdit: true,
        canDelete: true,
        canCreateReminder: true,
        canManageReminders: true,
        reminderEligibilityReason: null
      },
      {
        id: "evt-imported-late",
        title: "Soccer practice",
        description: null,
        isAllDay: false,
        startsAtUtc: "2026-04-23T04:30:00.000Z",
        endsAtUtc: "2026-04-23T06:00:00.000Z",
        isImported: true,
        sourceKind: "GoogleCalendarIcs",
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null,
        isReadOnly: true,
        canEdit: false,
        canDelete: false,
        canCreateReminder: false,
        canManageReminders: false,
        reminderEligibilityReason: "Imported calendar events are read-only and cannot have local reminders."
      }
    ]
  };
}

function buildMonthAgendaResponse(): UpcomingEventsResponse {
  return {
    windowStartUtc: "2026-03-30T05:00:00.000Z",
    windowEndUtc: "2026-05-11T05:00:00.000Z",
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
        lastGoogleSyncSucceededAtUtc: null,
        isReadOnly: false,
        canEdit: true,
        canDelete: true,
        canCreateReminder: false,
        canManageReminders: false,
        reminderEligibilityReason: "Recurring events cannot have reminders in this cleanup pass."
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
        lastGoogleSyncSucceededAtUtc: null,
        isReadOnly: true,
        canEdit: false,
        canDelete: false,
        canCreateReminder: false,
        canManageReminders: false,
        reminderEligibilityReason: "Imported calendar events are read-only and cannot have local reminders."
      },
      {
        id: "evt-imported-late",
        title: "Soccer practice",
        description: null,
        isAllDay: false,
        startsAtUtc: "2026-04-23T04:30:00.000Z",
        endsAtUtc: "2026-04-23T06:00:00.000Z",
        isImported: true,
        sourceKind: "GoogleCalendarIcs",
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null,
        isReadOnly: true,
        canEdit: false,
        canDelete: false,
        canCreateReminder: false,
        canManageReminders: false,
        reminderEligibilityReason: "Imported calendar events are read-only and cannot have local reminders."
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
      createdAtUtc: "2026-04-20T12:00:00.000Z",
      isReadOnly: false,
      canDismiss: true,
      canSnooze: true,
      canDelete: true
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
      isRecurring: false,
      recurrencePattern: "None",
      recurrenceSummary: "One-time",
      weeklyDays: [],
      recursUntilUtc: null,
      isImported: false,
      sourceKind: null,
      isGoogleMirrorEnabled: false,
      googleSyncStatus: null,
      googleSyncError: null,
      googleTargetDisplayName: null,
      lastGoogleSyncSucceededAtUtc: null,
      nextOccurrenceStartsAtUtc: "2026-04-20T14:30:00.000Z",
      createdAtUtc: "2026-04-01T10:00:00.000Z",
      isReadOnly: false,
      canEdit: true,
      canDelete: true,
      canCreateReminder: true,
      canManageReminders: true,
      reminderEligibilityReason: null
    }
  ];
}

test("derives week windows from a household-local anchor date", () => {
  expect(getWeekStartDate(new Date("2026-04-23T18:00:00.000Z"), "America/Chicago")).toBe("2026-04-20");
});

test("derives month anchors, six-week grids, and local midnight UTC starts", () => {
  expect(getMonthStartDate(new Date("2026-04-23T18:00:00.000Z"), "America/Chicago")).toBe("2026-04-01");
  expect(getMonthGridStartDate("2026-04-01")).toBe("2026-03-30");
  expect(getUtcStartOfLocalDate("2026-04-20", "America/Chicago")).toBe("2026-04-20T05:00:00.000Z");
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
    householdTimeZoneId: "America/Chicago",
    weekStartDate: "2026-04-20",
    visibleMonthStartDate: "2026-04-01",
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
    householdTimeZoneId: "America/Chicago",
    weekStartDate: "2026-04-20",
    visibleMonthStartDate: "2026-04-01",
    selectedDate: "2026-04-22",
    now: new Date("2026-04-20T14:00:00.000Z")
  });

  expect(viewModel.mobileMonth.selectedDay.items[0]?.kind).toBe("event");
  expect(viewModel.mobileMonth.selectedDay.items[0]?.sourceLabel).toBe("imported");
  expect(viewModel.mobileMonth.selectedDay.items[0]?.accessState).toBe("read-only");
});

test("expands late-night events across the local days they span", () => {
  const viewModel = buildFamilyCalendarViewModel({
    weekAgenda: buildWeekAgendaResponse(),
    monthAgenda: buildMonthAgendaResponse(),
    reminders: buildReminders(),
    home: buildHomeResponse(),
    seriesItems: buildSeries(),
    isOwner: true,
    householdTimeZoneId: "America/Chicago",
    weekStartDate: "2026-04-20",
    visibleMonthStartDate: "2026-04-01",
    selectedDate: "2026-04-23",
    now: new Date("2026-04-20T14:00:00.000Z")
  });

  const april22 = viewModel.mobileMonth.days.find((day) => day.date === "2026-04-22");
  const april23 = viewModel.mobileMonth.days.find((day) => day.date === "2026-04-23");

  expect(april22?.eventTiles[0]?.isStart).toBeTruthy();
  expect(april22?.eventTiles[0]?.isEnd).toBeFalsy();
  expect(april23?.eventTiles[0]?.isStart).toBeFalsy();
  expect(april23?.eventTiles[0]?.isEnd).toBeTruthy();
  const selectedEvent = viewModel.mobileMonth.selectedDay.items.find(
    (item): item is CalendarEventItem => item.kind === "event"
  );
  expect(selectedEvent?.title).toBe("Soccer practice");
  expect(selectedEvent?.spanLabel).toBe("Ends today");
});

test("creates selected-date drafts that keep the chosen date in the existing event form", () => {
  const draft = createMemberEventDraftForDate("2026-04-24", new Date("2026-04-20T14:15:00.000Z"));

  expect(draft.allDayDate).toBe("2026-04-24");
  expect(draft.startsAtLocal.startsWith("2026-04-24T")).toBeTruthy();
  expect(draft.endsAtLocal.startsWith("2026-04-24T")).toBeTruthy();
});

test("derives owner editable vs read-only access state correctly", () => {
  expect(getCalendarAccessState({ canEdit: true })).toBe("editable");
  expect(getCalendarAccessState({ canEdit: false })).toBe("read-only");
});
