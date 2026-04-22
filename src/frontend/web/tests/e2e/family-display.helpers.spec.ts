import { expect, test } from "@playwright/test";
import {
  applyDisplayRefreshFailure,
  applyDisplayRefreshSuccess,
  buildDisplayViewModel,
  createInitialDisplaySurfaceState,
  type DisplaySnapshot
} from "../../lib/family-display";

function buildSnapshot(overrides: Partial<DisplaySnapshot> = {}): DisplaySnapshot {
  return {
    accessMode: "DisplayToken",
    deviceName: "Kitchen Display",
    householdName: "The Parkers",
    householdTimeZoneId: "UTC",
    presentationMode: "Balanced",
    agendaDensityMode: "Comfortable",
    accessTokenHint: "abcd1234",
    generatedAtUtc: "2026-04-20T14:00:00.000Z",
    sections: [],
    agendaSection: {
      windowStartUtc: "2026-04-20T00:00:00.000Z",
      windowEndUtc: "2026-04-27T00:00:00.000Z",
      nextItem: null,
      allDayItems: [],
      soonItems: [],
      laterTodayItems: [],
      upcomingDays: [],
      upcomingDayGroups: [],
      items: []
    },
    upcomingReminders: [],
    dueChores: [],
    pinnedNotes: [],
    ...overrides
  };
}

test("builds a TV view model with now, next, today, and board distinctions", () => {
  const snapshot = buildSnapshot({
    agendaSection: {
      windowStartUtc: "2026-04-20T00:00:00.000Z",
      windowEndUtc: "2026-04-27T00:00:00.000Z",
      nextItem: null,
      allDayItems: [],
      soonItems: [],
      laterTodayItems: [],
      upcomingDays: [],
      upcomingDayGroups: [],
      items: [
        {
          title: "Breakfast cleanup",
          startsAtUtc: "2026-04-20T13:45:00.000Z",
          endsAtUtc: "2026-04-20T14:15:00.000Z",
          isAllDay: false,
          description: "Countertops and lunch prep",
          isImported: false,
          sourceKind: null
        },
        {
          title: "School pickup",
          startsAtUtc: "2026-04-20T15:00:00.000Z",
          endsAtUtc: "2026-04-20T15:30:00.000Z",
          isAllDay: false,
          description: null,
          isImported: false,
          sourceKind: null
        },
        {
          title: "Soccer practice",
          startsAtUtc: "2026-04-20T18:00:00.000Z",
          endsAtUtc: "2026-04-20T19:00:00.000Z",
          isAllDay: false,
          description: null,
          isImported: true,
          sourceKind: "GoogleCalendarIcs"
        },
        {
          title: "Choir recital",
          startsAtUtc: "2026-04-21T18:00:00.000Z",
          endsAtUtc: "2026-04-21T19:00:00.000Z",
          isAllDay: false,
          description: null,
          isImported: false,
          sourceKind: null
        }
      ]
    },
    upcomingReminders: [
      {
        eventTitle: "School pickup",
        minutesBefore: 20,
        dueAtUtc: "2026-04-20T14:40:00.000Z"
      }
    ],
    dueChores: [
      {
        title: "Pack lunches",
        assignedMemberName: "Morgan",
        recurrenceKind: "Daily"
      }
    ],
    pinnedNotes: [
      {
        title: "Dinner plan",
        body: "Tacos tonight.",
        authorDisplayName: "Morgan"
      }
    ]
  });

  const viewModel = buildDisplayViewModel(snapshot, new Date("2026-04-20T14:00:00.000Z"));

  expect(viewModel.nowItems.map((item) => item.title)).toEqual(["Breakfast cleanup"]);
  expect(viewModel.nextItem?.title).toBe("School pickup");
  expect(viewModel.todayAgenda.map((item) => item.title)).toEqual(["Soccer practice"]);
  expect(viewModel.todayAgenda[0]?.sourceLabel).toBe("imported");
  expect(viewModel.reminders[0]?.leadLabel).toBe("20 min before");
  expect(viewModel.chores[0]?.ownerDisplay.label).toBe("Morgan");
  expect(viewModel.notes[0]?.authorLabel).toContain("Morgan");
});

test("uses the household timezone when assigning today and tomorrow labels", () => {
  const snapshot = buildSnapshot({
    householdTimeZoneId: "America/Chicago",
    agendaSection: {
      windowStartUtc: "2026-04-11T00:00:00.000Z",
      windowEndUtc: "2026-04-18T00:00:00.000Z",
      nextItem: null,
      allDayItems: [],
      soonItems: [],
      laterTodayItems: [],
      upcomingDays: [],
      upcomingDayGroups: [],
      items: [
        {
          title: "Imported practice",
          startsAtUtc: "2026-04-11T03:00:00.000Z",
          endsAtUtc: "2026-04-11T04:00:00.000Z",
          isAllDay: false,
          description: null,
          isImported: true,
          sourceKind: "GoogleCalendarIcs"
        },
        {
          title: "Breakfast run",
          startsAtUtc: "2026-04-11T15:00:00.000Z",
          endsAtUtc: "2026-04-11T15:30:00.000Z",
          isAllDay: false,
          description: null,
          isImported: false,
          sourceKind: null
        }
      ]
    }
  });

  const viewModel = buildDisplayViewModel(snapshot, new Date("2026-04-11T02:00:00.000Z"));

  expect(viewModel.nextItem?.dayLabel).toBe("Today");
  expect(viewModel.upcomingDays[0]?.label).toBe("Tomorrow");
});

test("keeps the last good payload during refresh failures and only suggests reload without one", () => {
  const snapshot = buildSnapshot();

  const liveState = applyDisplayRefreshSuccess(
    snapshot,
    "2026-04-20T14:00:05.000Z",
    createInitialDisplaySurfaceState()
  );

  const staleState = applyDisplayRefreshFailure(
    liveState,
    "2026-04-20T14:01:00.000Z",
    3
  );

  expect(staleState.status).toBe("stale");
  expect(staleState.snapshot?.deviceName).toBe("Kitchen Display");
  expect(staleState.shouldReload).toBe(false);
  expect(staleState.errorMessage).toContain("Showing the last household board");

  const firstFailure = applyDisplayRefreshFailure(createInitialDisplaySurfaceState(), "2026-04-20T14:01:00.000Z", 3);
  const secondFailure = applyDisplayRefreshFailure(firstFailure, "2026-04-20T14:02:00.000Z", 3);
  const thirdFailure = applyDisplayRefreshFailure(secondFailure, "2026-04-20T14:03:00.000Z", 3);

  expect(thirdFailure.status).toBe("error");
  expect(thirdFailure.shouldReload).toBe(true);
});
