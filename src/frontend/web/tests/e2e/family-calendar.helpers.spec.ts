import { expect, test } from "@playwright/test";
import {
  buildFamilyCalendarViewModel,
  getCalendarAccessState,
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

function buildAgendaResponse(): UpcomingEventsResponse {
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
        sourceKind: null
      },
      {
        id: "evt-imported",
        title: "Soccer practice",
        description: null,
        isAllDay: false,
        startsAtUtc: "2026-04-22T23:00:00.000Z",
        endsAtUtc: "2026-04-23T00:00:00.000Z",
        isImported: true,
        sourceKind: "GoogleCalendarIcs"
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
      nextOccurrenceStartsAtUtc: "2026-04-20T14:30:00.000Z",
      createdAtUtc: "2026-04-01T10:00:00.000Z"
    }
  ];
}

test("derives week windows from an anchor date", () => {
  expect(getWeekStartUtc(new Date("2026-04-23T18:00:00.000Z"))).toBe("2026-04-20T00:00:00.000Z");
});

test("joins reminders to owning event ids", () => {
  const joined = joinRemindersToEventIds(buildReminders());
  expect(joined.get("evt-local")).toHaveLength(1);
  expect(joined.get("evt-local")?.[0]?.eventTitle).toBe("Morning dropoff");
});

test("builds a family calendar view model with local, imported, and reminder distinctions", () => {
  const now = new Date("2026-04-20T14:00:00.000Z");
  const viewModel = buildFamilyCalendarViewModel({
    agenda: buildAgendaResponse(),
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
    now
  });

  expect(viewModel.weekRangeLabel).toContain("Apr");
  expect(viewModel.totalEvents).toBe(2);
  expect(viewModel.importedCount).toBe(1);
  expect(viewModel.reminderCount).toBe(1);
  expect(viewModel.editableCount).toBe(1);
  expect(viewModel.days[0]?.items.some((item) => item.title === "Morning dropoff")).toBeTruthy();
  expect(viewModel.days[0]?.items.some((item) => item.kind === "reminder")).toBeTruthy();
  expect(viewModel.days[2]?.items[0]?.sourceLabel).toBe("imported");
});

test("derives owner editable vs read-only access state correctly", () => {
  expect(getCalendarAccessState(true, false)).toBe("editable");
  expect(getCalendarAccessState(true, true)).toBe("read-only");
  expect(getCalendarAccessState(false, false)).toBe("read-only");
});
