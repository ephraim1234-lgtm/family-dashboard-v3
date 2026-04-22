import type { Page, Route } from "@playwright/test";
import { expect, test, useMobileViewport } from "./fixtures";
import type { HomeResponse } from "../../lib/family-command-center";

type SessionRole = "Owner" | "Member";

async function freezeClientDate(page: Page, isoDate: string) {
  await page.addInitScript((dateString) => {
    const fixedTime = new Date(dateString).valueOf();
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(fixedTime);
          return;
        }

        if (args.length === 1) {
          super(args[0] as string | number | Date);
          return;
        }

        const [year, month, date, hours, minutes, seconds, milliseconds] = args as [
          number,
          number,
          number?,
          number?,
          number?,
          number?,
          number?
        ];
        super(year, month, date, hours, minutes, seconds, milliseconds);
      }

      static now() {
        return fixedTime;
      }
    }

    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;

    // @ts-expect-error test-only Date override
    window.Date = MockDate;
  }, isoDate);
}

function buildHomeResponse(): HomeResponse {
  return {
    todayEvents: [
      {
        title: "Morning dropoff",
        startsAtUtc: "2026-04-20T14:30:00.000Z",
        endsAtUtc: "2026-04-20T15:00:00.000Z",
        isAllDay: false,
        isImported: false
      }
    ],
    todayChores: [],
    pinnedNotes: [
      {
        id: "note-1",
        title: "Dinner plan",
        body: "Tacos tonight.",
        authorDisplayName: "Morgan"
      }
    ],
    recentActivity: [],
    upcomingDays: [
      {
        date: "2026-04-20",
        events: [
          {
            scheduledEventId: "evt-local",
            title: "Morning dropoff",
            startsAtUtc: "2026-04-20T14:30:00.000Z",
            endsAtUtc: "2026-04-20T15:00:00.000Z",
            isAllDay: false,
            isImported: false
          }
        ]
      }
    ],
    pendingReminders: [
      {
        id: "rem-home",
        eventTitle: "Morning dropoff",
        minutesBefore: 20,
        dueAtUtc: "2026-04-20T14:10:00.000Z"
      }
    ],
    memberChoreProgress: [],
    upcomingEventCount: 1,
    pendingReminderCount: 1
  };
}

async function mockCalendarRoutes(page: Page, role: SessionRole = "Owner") {
  let agendaItems: Array<{
    id: string;
    title: string;
    description: string | null;
    isAllDay: boolean;
    startsAtUtc: string | null;
    endsAtUtc: string | null;
    isImported: boolean;
    sourceKind: string | null;
    isGoogleMirrorEnabled: boolean;
    googleSyncStatus: string | null;
    googleSyncError: string | null;
    googleTargetDisplayName: string | null;
    lastGoogleSyncSucceededAtUtc: string | null;
  }> = [
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
      id: "evt-imported",
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
      lastGoogleSyncSucceededAtUtc: null
    },
    {
      id: "evt-next",
      title: "Science fair",
      description: "Gymnasium",
      isAllDay: false,
      startsAtUtc: "2026-04-28T16:00:00.000Z",
      endsAtUtc: "2026-04-28T17:30:00.000Z",
      isImported: false,
      sourceKind: null,
      isGoogleMirrorEnabled: false,
      googleSyncStatus: null,
      googleSyncError: null,
      googleTargetDisplayName: null,
      lastGoogleSyncSucceededAtUtc: null
    }
  ];

  let seriesItems = [
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

  let reminders = [
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

  const homeResponse = buildHomeResponse();

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        userId: "dev-user",
        activeHouseholdId: "household-1",
        activeHouseholdRole: role
      })
    });
  });

  await page.route("**/api/households/current", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        householdId: "household-1",
        householdName: "The Parkers",
        timeZoneId: "America/Chicago",
        activeRole: role,
        membershipStatus: "Active"
      })
    });
  });

  await page.route("**/api/app/home", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(homeResponse)
    });
  });

  await page.route("**/api/scheduling/agenda**", async (route: Route) => {
    const requestUrl = new URL(route.request().url());
    const startUtc = requestUrl.searchParams.get("startUtc") ?? "2026-04-20T00:00:00.000Z";
    const days = Number(requestUrl.searchParams.get("days") ?? "7");
    const start = new Date(startUtc).getTime();
    const end = start + days * 24 * 60 * 60 * 1000;
    const items = agendaItems.filter((item) => {
      const startsAt = item.startsAtUtc ? new Date(item.startsAtUtc).getTime() : start;
      return startsAt >= start && startsAt < end;
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        windowStartUtc: startUtc,
        windowEndUtc: new Date(end).toISOString(),
        items
      })
    });
  });

  await page.route("**/api/scheduling/events/series", async (route) => {
    await route.fulfill({
      status: role === "Owner" ? 200 : 403,
      contentType: "application/json",
      body: role === "Owner" ? JSON.stringify({ items: seriesItems }) : JSON.stringify({ items: [] })
    });
  });

  await page.route("**/api/notifications/reminders", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: reminders })
      });
      return;
    }

    const body = route.request().postDataJSON() as {
      scheduledEventId: string;
      minutesBefore: number;
    };
    const matchingEvent = agendaItems.find((item) => item.id === body.scheduledEventId);
    reminders = [
      {
        id: "rem-new",
        scheduledEventId: body.scheduledEventId,
        eventTitle: matchingEvent?.title ?? "New reminder",
        minutesBefore: body.minutesBefore,
        dueAtUtc: "2026-04-20T13:55:00.000Z",
        status: "Pending",
        firedAtUtc: null,
        createdAtUtc: "2026-04-20T12:30:00.000Z"
      },
      ...reminders
    ];

    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/notifications/reminders/rem-1/dismiss", async (route) => {
    reminders = reminders.map((item) =>
      item.id === "rem-1" ? { ...item, status: "Dismissed" } : item
    );
    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/notifications/reminders/rem-1/snooze", async (route) => {
    reminders = reminders.map((item) =>
      item.id === "rem-1"
        ? { ...item, dueAtUtc: "2026-04-20T15:10:00.000Z" }
        : item
    );
    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/notifications/reminders/rem-1", async (route) => {
    reminders = reminders.filter((item) => item.id !== "rem-1");
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/scheduling/events/member", async (route) => {
    const body = route.request().postDataJSON() as {
      title: string;
      description: string | null;
      isAllDay: boolean;
      startsAtUtc: string | null;
      endsAtUtc: string | null;
    };
    agendaItems = [
      {
        id: "evt-new",
        title: body.title,
        description: body.description,
        isAllDay: body.isAllDay,
        startsAtUtc: body.startsAtUtc,
        endsAtUtc: body.endsAtUtc,
        isImported: false,
        sourceKind: null,
        isGoogleMirrorEnabled: false,
        googleSyncStatus: null,
        googleSyncError: null,
        googleTargetDisplayName: null,
        lastGoogleSyncSucceededAtUtc: null
      },
      ...agendaItems
    ];
    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/scheduling/events/evt-local", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { title: string; startsAtUtc: string; endsAtUtc: string };
      agendaItems = agendaItems.map((item) =>
        item.id === "evt-local"
          ? {
              ...item,
              title: body.title,
              startsAtUtc: body.startsAtUtc,
              endsAtUtc: body.endsAtUtc
            }
          : item
      );
      seriesItems = seriesItems.map((item) =>
        item.id === "evt-local"
          ? {
              ...item,
              title: body.title,
              startsAtUtc: body.startsAtUtc,
              endsAtUtc: body.endsAtUtc
            }
          : item
      );
      await route.fulfill({ status: 200, body: "" });
      return;
    }

    agendaItems = agendaItems.filter((item) => item.id !== "evt-local");
    seriesItems = seriesItems.filter((item) => item.id !== "evt-local");
    reminders = reminders.filter((item) => item.scheduledEventId !== "evt-local");
    await route.fulfill({ status: 204, body: "" });
  });
}

test("renders a week-first family calendar with local, imported, and reminder distinctions on desktop", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");
  await mockCalendarRoutes(page, "Owner");

  await page.goto("/app/calendar");

  await expect(page.getByTestId("family-calendar-page")).toBeVisible();
  await expect(page.getByTestId("family-calendar-week-grid")).toContainText("Morning dropoff");
  await expect(page.getByTestId("family-calendar-week-grid")).toContainText("Soccer practice");
  await expect(page.getByTestId("family-calendar-week-grid")).toContainText("Read only");

  await page.getByTestId("calendar-entry-event-evt-imported").click();
  await expect(page.getByTestId("calendar-detail-drawer")).toContainText("Imported calendar items stay visible");
  await expect(page.getByRole("button", { name: "Edit series" })).toHaveCount(0);
});

test("supports week navigation, agenda switching, local editing, and reminder actions for owners on desktop", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");
  await mockCalendarRoutes(page, "Owner");

  await page.goto("/app/calendar");

  await page.getByTestId("calendar-view-toggle").getByRole("button", { name: "Agenda" }).click();
  await expect(page.getByTestId("family-calendar-agenda-view")).toBeVisible();

  await page.getByRole("button", { name: "Next week" }).click();
  await expect(page.getByTestId("family-calendar-section")).toContainText("Science fair");

  await page.getByRole("button", { name: "This week" }).click();
  await expect(page.getByTestId("family-calendar-section")).toContainText("Morning dropoff");

  await page.getByTestId("calendar-view-toggle").getByRole("button", { name: "Month" }).click();
  await expect(page.getByTestId("family-calendar-desktop-month")).toBeVisible();
  await page.getByTestId("calendar-month-day-2026-04-22").click();
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Soccer practice");

  await page.getByLabel("Calendar event title").fill("Neighborhood potluck");
  await page.getByLabel("Calendar event starts").fill("2026-04-24T16:00");
  await page.getByLabel("Calendar event ends").fill("2026-04-24T17:00");
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText("Event added to the family calendar.")).toBeVisible();
  await expect(page.getByTestId("family-calendar-section")).toContainText("Neighborhood potluck");

  await page.getByTestId("calendar-entry-event-evt-local").click();
  const detailDrawer = page.getByTestId("calendar-detail-drawer");
  await detailDrawer.getByRole("button", { name: "Edit series" }).click();
  await detailDrawer.getByLabel("Title").fill("Morning dropoff updated");
  await detailDrawer.getByRole("button", { name: "Save series" }).click();
  await expect(page.getByText("Series updated.")).toBeVisible();
  await expect(page.getByTestId("family-calendar-section")).toContainText("Morning dropoff updated");

  await detailDrawer.getByRole("button", { name: "Edit series" }).click();
  await detailDrawer.getByRole("button", { name: "Add Reminder" }).click();
  await expect(page.getByText("Reminder added.")).toBeVisible();
  await detailDrawer.getByRole("button", { name: "Delete series" }).click();
  await expect(page.getByText("Series deleted.")).toBeVisible();
});

test("lets non-owner members view the desktop calendar while keeping local item edits read-only", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");
  await mockCalendarRoutes(page, "Member");

  await page.goto("/app/calendar");

  await expect(page.getByTestId("family-calendar-week-grid")).toContainText("Morning dropoff");
  await page.getByTestId("calendar-entry-event-evt-local").click();
  await expect(page.getByTestId("calendar-detail-drawer")).toContainText("Local events stay visible here while owner edits remain protected in this slice.");
  await expect(page.getByRole("button", { name: "Edit series" })).toHaveCount(0);
});

test("renders a mobile month-first planner with month navigation and selected-day detail", async ({ page }) => {
  await useMobileViewport(page);
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");
  await mockCalendarRoutes(page, "Owner");

  await page.goto("/app/calendar");

  await expect(page.getByTestId("family-calendar-mobile-month")).toBeVisible();
  await expect(page.getByTestId("family-calendar-week-grid")).toHaveCount(0);
  await expect(page.getByTestId("calendar-month-label")).toHaveText("April 2026");
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Monday, Apr 20");
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Morning dropoff");

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByTestId("calendar-month-label")).toHaveText("May 2026");
  await expect(page.getByTestId("calendar-selected-day-add")).toContainText("May 1");

  await page.getByRole("button", { name: "This month" }).click();
  await expect(page.getByTestId("calendar-month-label")).toHaveText("April 2026");

  await page.getByTestId("calendar-month-grid").dispatchEvent("touchstart", {
    changedTouches: [{ clientX: 240, clientY: 140 }]
  });
  await page.getByTestId("calendar-month-grid").dispatchEvent("touchend", {
    changedTouches: [{ clientX: 40, clientY: 140 }]
  });
  await expect(page.getByTestId("calendar-month-label")).toHaveText("May 2026");

  await page.getByRole("button", { name: "This month" }).click();

  await page.getByTestId("calendar-month-day-2026-04-22").click();
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Soccer practice");
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Read only");
});

test("supports create-from-day and keeps local, imported, and reminder distinctions visible on mobile", async ({ page }) => {
  await useMobileViewport(page);
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");
  await mockCalendarRoutes(page, "Owner");

  await page.goto("/app/calendar");

  await page.getByTestId("calendar-month-day-2026-04-20").click();
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Morning dropoff");
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Pending");
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Editable");

  await page.getByTestId("calendar-entry-reminder-rem-1").click();
  await expect(page.getByTestId("calendar-detail-drawer")).toContainText("Reminder");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByTestId("calendar-month-day-2026-04-22").click();
  await page.getByTestId("calendar-selected-day-add").click();

  await expect(page.getByTestId("calendar-mobile-quick-create")).toBeVisible();
  await expect(page.getByLabel("Calendar event starts")).toHaveValue("2026-04-22T15:00");
  await expect(page.getByLabel("Calendar event ends")).toHaveValue("2026-04-22T16:00");

  await page.getByLabel("Calendar event title").fill("Neighborhood potluck");
  await page.getByRole("button", { name: "Add event" }).click();

  await expect(page.getByText("Event added to the family calendar.")).toBeVisible();
  await expect(page.getByTestId("calendar-selected-day")).toContainText("Neighborhood potluck");
});
