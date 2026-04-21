import { expect, test } from "@playwright/test";
import {
  buildCommandCenterViewModel,
  createOwnerDisplay,
  getReminderUrgencyState,
  getSourceLabel,
  type HomeResponse,
  normalizeHomeChore,
  normalizeHomeEvent,
  normalizeHomeNote
} from "../../lib/family-command-center";

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

test("normalizes source, type, urgency, and ownership labels for family-facing items", () => {
  const now = new Date("2026-04-20T14:30:00.000Z");
  const localEvent = normalizeHomeEvent({
    title: "School pickup",
    startsAtUtc: "2026-04-20T15:00:00.000Z",
    endsAtUtc: "2026-04-20T15:30:00.000Z",
    isAllDay: false,
    isImported: false
  }, 0, now);
  const importedEvent = normalizeHomeEvent({
    title: "Soccer practice",
    startsAtUtc: "2026-04-20T18:00:00.000Z",
    endsAtUtc: "2026-04-20T19:00:00.000Z",
    isAllDay: false,
    isImported: true
  }, 1, now);
  const chore = normalizeHomeChore({
    id: "chore-1",
    title: "Pack lunches",
    assignedMembershipId: null,
    assignedMemberName: null,
    completedToday: false
  });
  const note = normalizeHomeNote({
    id: "note-1",
    title: "Grandma visiting",
    body: "Bring the pie carrier back home.",
    authorDisplayName: "Morgan"
  });

  expect(getSourceLabel(false)).toBe("local");
  expect(getSourceLabel(true)).toBe("imported");
  expect(localEvent.kind).toBe("event");
  expect(localEvent.urgencyState).toBe("next");
  expect(importedEvent.sourceLabel).toBe("imported");
  expect(chore.kind).toBe("chore");
  expect(chore.ownerDisplay).toEqual(createOwnerDisplay(null));
  expect(note.kind).toBe("note");
  expect(getReminderUrgencyState({ dueAtUtc: "2026-04-20T13:45:00.000Z" }, now)).toBe("overdue");
});

test("selects happening-now and next-up items from the home payload", () => {
  const now = new Date("2026-04-20T14:30:00.000Z");
  const viewModel = buildCommandCenterViewModel(buildHomeResponse({
    todayEvents: [
      {
        title: "Breakfast cleanup",
        startsAtUtc: "2026-04-20T14:00:00.000Z",
        endsAtUtc: "2026-04-20T15:00:00.000Z",
        isAllDay: false,
        isImported: false
      },
      {
        title: "Dentist",
        startsAtUtc: "2026-04-20T16:00:00.000Z",
        endsAtUtc: "2026-04-20T17:00:00.000Z",
        isAllDay: false,
        isImported: true
      }
    ],
    upcomingDays: [
      {
        date: "2026-04-21",
        events: [
          {
            scheduledEventId: "evt-upcoming",
            title: "Choir recital",
            startsAtUtc: "2026-04-21T18:00:00.000Z",
            endsAtUtc: "2026-04-21T19:00:00.000Z",
            isAllDay: false,
            isImported: false
          }
        ]
      }
    ],
    upcomingEventCount: 1
  }), now);

  expect(viewModel.hero.happeningNow).toHaveLength(1);
  expect(viewModel.hero.happeningNow[0]?.title).toBe("Breakfast cleanup");
  expect(viewModel.hero.nextUp?.title).toBe("Dentist");
});

test("detects schedule pressure when timed events overlap", () => {
  const viewModel = buildCommandCenterViewModel(buildHomeResponse({
    todayEvents: [
      {
        title: "Dentist",
        startsAtUtc: "2026-04-20T15:00:00.000Z",
        endsAtUtc: "2026-04-20T16:00:00.000Z",
        isAllDay: false,
        isImported: true
      },
      {
        title: "Library pickup",
        startsAtUtc: "2026-04-20T15:30:00.000Z",
        endsAtUtc: "2026-04-20T16:15:00.000Z",
        isAllDay: false,
        isImported: false
      }
    ]
  }), new Date("2026-04-20T14:00:00.000Z"));

  expect(viewModel.needsAttention.schedulePressure).toHaveLength(1);
  expect(viewModel.needsAttention.schedulePressure[0]?.title).toContain("Dentist overlaps Library pickup");
});

test("groups chores into member lanes with progress and unassigned work", () => {
  const viewModel = buildCommandCenterViewModel(buildHomeResponse({
    todayChores: [
      {
        id: "c1",
        title: "Pack lunches",
        assignedMembershipId: "m1",
        assignedMemberName: "Morgan",
        completedToday: false
      },
      {
        id: "c2",
        title: "Feed the dog",
        assignedMembershipId: "m1",
        assignedMemberName: "Morgan",
        completedToday: true
      },
      {
        id: "c3",
        title: "Take out recycling",
        assignedMembershipId: null,
        assignedMemberName: null,
        completedToday: false
      }
    ],
    memberChoreProgress: [
      {
        memberDisplayName: "Morgan",
        completionsThisWeek: 6,
        currentStreakDays: 4
      }
    ]
  }), new Date("2026-04-20T14:00:00.000Z"));

  expect(viewModel.memberLanes).toHaveLength(2);
  expect(viewModel.memberLanes[0]?.label).toBe("Morgan");
  expect(viewModel.memberLanes[0]?.openChores.map((item) => item.title)).toEqual(["Pack lunches"]);
  expect(viewModel.memberLanes[0]?.completedCount).toBe(1);
  expect(viewModel.memberLanes[0]?.currentStreakDays).toBe(4);
  expect(viewModel.memberLanes[1]?.ownerDisplay.kind).toBe("unassigned");
});
