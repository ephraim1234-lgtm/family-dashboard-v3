import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import type { HomeResponse } from "../../lib/family-command-center";

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

function createHomeResponse(): HomeResponse {
  return {
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
    ],
    todayChores: [
      {
        id: "chore-1",
        title: "Pack lunches",
        assignedMembershipId: "member-morgan",
        assignedMemberName: "Morgan",
        completedToday: false
      },
      {
        id: "chore-2",
        title: "Feed the dog",
        assignedMembershipId: "member-morgan",
        assignedMemberName: "Morgan",
        completedToday: true
      },
      {
        id: "chore-3",
        title: "Take out recycling",
        assignedMembershipId: null,
        assignedMemberName: null,
        completedToday: false
      }
    ],
    pinnedNotes: [
      {
        id: "note-1",
        title: "Grandma visiting",
        body: "Bring the pie carrier back home.",
        authorDisplayName: "Morgan"
      }
    ],
    recentActivity: [
      {
        kind: "ChoreCompletion",
        title: "Feed the dog",
        detail: null,
        actorDisplayName: "Morgan",
        occurredAtUtc: "2026-04-20T13:30:00.000Z"
      }
    ],
    upcomingDays: [
      {
        date: "2026-04-21",
        events: [
          {
            scheduledEventId: "evt-1",
            title: "Choir recital",
            startsAtUtc: "2026-04-21T18:00:00.000Z",
            endsAtUtc: "2026-04-21T19:00:00.000Z",
            isAllDay: false,
            isImported: false
          }
        ]
      },
      {
        date: "2026-04-22",
        events: [
          {
            scheduledEventId: "evt-2",
            title: "PTA meeting",
            startsAtUtc: "2026-04-22T00:00:00.000Z",
            endsAtUtc: "2026-04-22T23:59:00.000Z",
            isAllDay: true,
            isImported: true
          }
        ]
      }
    ],
    pendingReminders: [
      {
        id: "rem-1",
        eventTitle: "Morning meds",
        minutesBefore: 30,
        dueAtUtc: "2026-04-20T13:45:00.000Z"
      },
      {
        id: "rem-2",
        eventTitle: "Choir recital",
        minutesBefore: 20,
        dueAtUtc: "2026-04-21T17:40:00.000Z"
      }
    ],
    memberChoreProgress: [
      {
        memberDisplayName: "Morgan",
        completionsThisWeek: 6,
        currentStreakDays: 4
      }
    ],
    upcomingEventCount: 2,
    pendingReminderCount: 1
  };
}

async function mockOverviewRoutes(page: Page) {
  let homeResponse = createHomeResponse();

  await page.route("**/api/app/home", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(homeResponse)
    });
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        userId: "dev-user",
        activeHouseholdId: "household-1",
        activeHouseholdRole: "Owner"
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
        activeRole: "Owner",
        membershipStatus: "Active"
      })
    });
  });

  await page.route("**/api/households/members", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          { membershipId: "member-morgan", displayName: "Morgan" },
          { membershipId: "member-jules", displayName: "Jules" }
        ]
      })
    });
  });

  await page.route("**/api/food/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        summary: {
          recipeCount: 18,
          pantryItemCount: 54,
          lowStockCount: 2,
          shoppingItemCount: 7,
          activeCookingSessionCount: 1
        },
        tonightCookView: {
          title: "Sheet pan fajitas",
          reason: "Dinner still has pantry coverage and only a couple of missing pieces.",
          missingIngredientCount: 2
        }
      })
    });
  });

  await page.route("**/api/notes", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    const requestBody = route.request().postDataJSON() as { title: string; body: string | null };
    homeResponse = {
      ...homeResponse,
      pinnedNotes: [
        {
          id: "note-new",
          title: requestBody.title,
          body: requestBody.body,
          authorDisplayName: "Morgan"
        },
        ...homeResponse.pinnedNotes
      ]
    };

    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/scheduling/events/member", async (route) => {
    const requestBody = route.request().postDataJSON() as {
      title: string;
    };

    homeResponse = {
      ...homeResponse,
      upcomingDays: [
        {
          date: "2026-04-21",
          events: [
            {
              scheduledEventId: "evt-new",
              title: requestBody.title,
              startsAtUtc: "2026-04-21T20:00:00.000Z",
              endsAtUtc: "2026-04-21T21:00:00.000Z",
              isAllDay: false,
              isImported: false
            },
            ...homeResponse.upcomingDays[0].events
          ]
        },
        ...homeResponse.upcomingDays.slice(1)
      ],
      upcomingEventCount: homeResponse.upcomingEventCount + 1
    };

    await route.fulfill({ status: 200, body: "" });
  });

  await page.route("**/api/notifications/reminders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    const requestBody = route.request().postDataJSON() as {
      scheduledEventId: string;
      minutesBefore: number;
    };
    const matchingEvent = homeResponse.upcomingDays
      .flatMap((day) => day.events)
      .find((event) => event.scheduledEventId === requestBody.scheduledEventId);

    homeResponse = {
      ...homeResponse,
      pendingReminders: [
        {
          id: "rem-new",
          eventTitle: matchingEvent?.title ?? "New reminder",
          minutesBefore: requestBody.minutesBefore,
          dueAtUtc: "2026-04-21T19:40:00.000Z"
        },
        ...homeResponse.pendingReminders
      ]
    };

    await route.fulfill({ status: 200, body: "" });
  });
}

test("renders the command center sections with representative household data", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:30:00.000Z");
  await mockOverviewRoutes(page);

  await page.goto("/app");

  await expect(page.getByTestId("family-command-hero")).toContainText("Breakfast cleanup");
  await expect(page.getByTestId("family-command-hero")).toContainText("Dentist");
  await expect(page.getByTestId("today-by-member-section")).toContainText("Morgan");
  await expect(page.getByTestId("today-by-member-section")).toContainText("Pack lunches");
  await expect(page.getByTestId("needs-attention-section")).toContainText("Morning meds");
  await expect(page.getByTestId("needs-attention-section")).toContainText("Dentist overlaps Library pickup");
  await expect(page.getByTestId("household-board-section")).toContainText("Grandma visiting");
  await expect(page.getByTestId("household-board-section")).toContainText("Pantry, planning, and cooking");
  await expect(page.getByTestId("upcoming-section")).toContainText("Choir recital");
  await expect(page.getByTestId("upcoming-section")).toContainText("Imported");
});

test("keeps quick add event and reminder flows working from overview", async ({ page }) => {
  await freezeClientDate(page, "2026-04-20T14:30:00.000Z");
  await mockOverviewRoutes(page);

  await page.goto("/app");

  const quickAddSection = page.getByTestId("quick-add-section");

  await quickAddSection.getByRole("button", { name: "+ Event" }).click();
  await quickAddSection.getByLabel("Event title").fill("Neighborhood potluck");
  await quickAddSection.getByLabel("Event description").fill("Bring the folding chairs.");
  await quickAddSection.getByLabel("Event starts").fill("2026-04-21T15:00");
  await quickAddSection.getByLabel("Event ends").fill("2026-04-21T16:00");
  await quickAddSection.getByRole("button", { name: "Add event" }).click();

  await expect(page.getByText("Event added.")).toBeVisible();
  await expect(page.getByTestId("upcoming-section")).toContainText("Neighborhood potluck");

  await quickAddSection.getByRole("button", { name: "+ Reminder" }).click();
  await quickAddSection.getByLabel("Reminder event").selectOption("evt-1");
  await quickAddSection.getByLabel("Minutes before").fill("15");
  await quickAddSection.getByRole("button", { name: "Schedule reminder" }).click();

  await expect(page.getByText("Reminder scheduled.")).toBeVisible();
  await expect(page.getByTestId("household-board-section")).toContainText("Choir recital");
});
