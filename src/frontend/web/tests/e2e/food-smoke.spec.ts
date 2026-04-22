import { test, expect, gotoFood, uniqueName, useMobileViewport } from "./fixtures";

async function freezeClientDate(page: Parameters<typeof gotoFood>[0], isoDate: string) {
  await page.addInitScript((dateString) => {
    const fixedTime = new Date(`${dateString}T12:00:00Z`).valueOf();
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

test("loads the food module with the five primary tabs on desktop", async ({ page }) => {
  await gotoFood(page);

  await expect(page.getByTestId("food-tab-bar")).toBeVisible();
  await expect(page.getByTestId("food-action-bar")).toBeHidden();
  await expect(page.getByRole("tab", { name: "Home" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("food-home-overview")).toBeVisible();
  await expect(page.getByTestId("food-home-attention")).toBeVisible();

  await page.getByRole("tab", { name: "Home" }).click();
  await expect(page.getByTestId("food-home-workspace")).toBeVisible();

  await page.getByRole("tab", { name: "Recipes" }).click();
  await expect(page.getByRole("tab", { name: "Recipes" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("food-recipe-library")).toBeVisible();

  await page.getByRole("tab", { name: "Meals" }).click();
  await expect(page.getByRole("tab", { name: "Meals" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("food-meal-planning")).toBeVisible();

  await page.getByRole("tab", { name: "Pantry" }).click();
  await expect(page.getByRole("tab", { name: "Pantry" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("food-pantry-panel")).toBeVisible();

  await page.getByRole("tab", { name: "Shopping" }).click();
  await expect(page.getByRole("tab", { name: "Shopping" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("food-shopping-panel")).toBeVisible();
});

test("shows the empty-state home dashboard when nothing is planned today", async ({ page }) => {
  await freezeClientDate(page, "2099-01-01");
  await gotoFood(page);

  await expect(page.getByTestId("food-home-empty-state")).toBeVisible();
  await expect(page.getByTestId("food-home-recipes-preview")).toBeVisible();
});

test("surfaces today's meals on home cards with direct actions", async ({ page }) => {
  await gotoFood(page);

  await expect(page.getByTestId("food-home-today-section")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start cooking" }).first()).toBeVisible();
  await expect(
    page.getByText(/Pantry ready|\d+ missing/).first()
  ).toBeVisible();
});

test("shows the mobile quick-action bar and bottom drawers", async ({ page }) => {
  await useMobileViewport(page);
  await gotoFood(page);

  await expect(page.getByTestId("food-tab-bar")).toBeVisible();
  await expect(page.getByTestId("food-action-bar")).toBeVisible();

  await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to List" }).click();
  await expect(page.getByTestId("food-add-to-list-drawer")).toBeVisible();
  await page.getByTestId("food-add-to-list-drawer").getByRole("button", { name: /^Close$/ }).click();

  await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to Pantry" }).click();
  await expect(page.getByTestId("food-add-to-pantry-drawer")).toBeVisible();
  await page.getByTestId("food-add-to-pantry-drawer").getByRole("button", { name: /^Close$/ }).click();

  await page.getByTestId("food-action-bar").getByRole("button", { name: "Alerts" }).click();
  await expect(page.getByTestId("food-alerts-panel")).toBeVisible();
});

test("renders cooking routes without Food-local tab or action bars", async ({ page, foodApi }) => {
  const recipeOne = await foodApi.createRecipe({
    title: uniqueName("Lemon Herb Chicken"),
    ingredients: [{ ingredientName: "Chicken", quantity: 1, unit: "lb" }],
    steps: [{ instruction: "Cook the chicken." }]
  });
  const recipeTwo = await foodApi.createRecipe({
    title: uniqueName("Garlic Rice Pilaf"),
    ingredients: [{ ingredientName: "Rice", quantity: 2, unit: "cups" }],
    steps: [{ instruction: "Cook the rice." }]
  });

  const slot = await foodApi.createMealSlot({
    date: new Date().toISOString().slice(0, 10),
    title: uniqueName("Weeknight Chicken Dinner"),
    recipes: [
      { recipeId: recipeOne.id, role: "Main" },
      { recipeId: recipeTwo.id, role: "Side" }
    ]
  });

  const session = await foodApi.startCookingSession({
    mealPlanSlotId: slot.id
  });

  await page.goto(`/app/food/cooking/${session.id}`);
  await expect(page.getByTestId("cooking-session-page")).toBeVisible();
  await expect(page.getByTestId("cooking-session-title")).toContainText(slot.title);
  await expect(page.getByTestId("food-tab-bar")).toHaveCount(0);
  await expect(page.getByTestId("food-action-bar")).toHaveCount(0);

  await page.goto(`/app/food/cooking/${session.id}/tv`);
  await expect(page.getByTestId("food-tv-display")).toBeVisible();
  await expect(page.getByTestId("food-tv-title")).toContainText(slot.title);
  await expect(page.getByTestId("food-tv-current-step")).toBeVisible();
});
