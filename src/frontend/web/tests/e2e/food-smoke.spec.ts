import { test, expect, gotoFood, uniqueName } from "./fixtures";

test("loads the food module with the main sections for an authenticated household", async ({ page }) => {
  await gotoFood(page);

  await expect(page.getByTestId("food-tab-bar")).toBeVisible();
  await expect(page.getByTestId("food-action-bar")).toBeHidden();

  await page.getByRole("tab", { name: "Home" }).click();
  await expect(page.getByTestId("food-home-workspace")).toBeVisible();

  await page.getByRole("tab", { name: "Recipes" }).click();
  await expect(page.getByTestId("food-recipe-library")).toBeVisible();

  await page.getByRole("tab", { name: "Planning" }).click();
  await expect(page.getByTestId("food-meal-planning")).toBeVisible();

  await page.getByRole("tab", { name: "Pantry" }).click();
  await expect(page.getByTestId("food-pantry-panel")).toBeVisible();

  await page.getByRole("tab", { name: "Shopping" }).click();
  await expect(page.getByTestId("food-shopping-panel")).toBeVisible();
});

test("renders mobile and TV cooking routes for a valid session", async ({ page, foodApi }) => {
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

  await page.goto(`/app/food/cooking/${session.id}/tv`);
  await expect(page.getByTestId("food-tv-display")).toBeVisible();
  await expect(page.getByTestId("food-tv-title")).toContainText(slot.title);
  await expect(page.getByTestId("food-tv-current-step")).toBeVisible();
});
