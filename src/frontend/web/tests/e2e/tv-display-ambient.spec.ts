import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import type { DisplaySnapshot } from "../../lib/family-display";

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

function buildDisplaySnapshot(overrides: Partial<DisplaySnapshot> = {}): DisplaySnapshot {
  return {
    accessMode: "DisplayToken",
    deviceName: "Kitchen Display",
    householdName: "The Parkers",
    householdTimeZoneId: "America/Chicago",
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
    ],
    ...overrides
  };
}

test("renders the token display as an ambient household board without the shared shell", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");

  await page.route("**/api/display/projection/test-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildDisplaySnapshot())
    });
  });

  await page.goto("/display/test-token");

  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(page.getByTestId("display-surface-page")).toBeVisible();
  await expect(page.getByTestId("display-now-section")).toContainText("Breakfast cleanup");
  await expect(page.getByTestId("display-next-section")).toContainText("School pickup");
  await expect(page.getByTestId("display-today-section")).toContainText("Soccer practice");
  await expect(page.getByTestId("display-board-section")).toContainText("Pack lunches");
  await expect(page.getByTestId("display-board-section")).toContainText("Dinner plan");
  await expect(page.getByText("Imported")).toBeVisible();
  await expect(page.getByTestId("display-next-section")).toContainText("Local");
});

test("keeps the last good board visible when refreshes go stale", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");
  await page.addInitScript(() => {
    // @ts-expect-error test-only hook
    window.__HOUSEHOLDOPS_DISPLAY_REFRESH_INTERVAL_MS = 100;
  });

  let requestCount = 0;
  await page.route("**/api/display/projection/test-token", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildDisplaySnapshot())
      });
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "temporarily unavailable" })
    });
  });

  await page.goto("/display/test-token");

  await expect(page.getByTestId("display-next-section")).toContainText("School pickup");
  await expect(page.getByTestId("display-status-banner")).toContainText("Connection interrupted");
  await expect(page.getByTestId("display-status-banner")).toContainText("Stale");
  await expect(page.getByTestId("display-next-section")).toContainText("School pickup");
});

test("shows calm empty states and handles missing tokens gracefully", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:00:00.000Z");

  await page.route("**/api/display/projection/quiet-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildDisplaySnapshot({
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
          pinnedNotes: []
        })
      )
    });
  });

  await page.route("**/api/display/projection/missing-token", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "not found" })
    });
  });

  await page.goto("/display/quiet-token");
  await expect(page.getByText("Calm right now")).toBeVisible();
  await expect(page.getByText("Open runway")).toBeVisible();
  await expect(page.getByText("Board is clear")).toBeVisible();

  await page.goto("/display/missing-token");
  await expect(page.getByText("Display unavailable")).toBeVisible();
});
