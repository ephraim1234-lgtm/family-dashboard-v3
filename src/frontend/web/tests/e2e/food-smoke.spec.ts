import { test, expect, gotoFood, uniqueName } from "./fixtures";

test("loads the food module with the main sections for an authenticated household", async ({ page }) => {
  await gotoFood(page);

  await expect(page.getByTestId("food-recipe-capture-panel")).toBeVisible();
  await expect(page.getByTestId("food-recipe-library")).toBeVisible();
  await expect(page.getByTestId("food-meal-planning")).toBeVisible();
  await expect(page.getByTestId("food-pantry-panel")).toBeVisible();
  await expect(page.getByTestId("food-shopping-panel")).toBeVisible();
  await expect(page.getByTestId("food-cooking-panel")).toBeVisible();
});

test("renders mobile and TV cooking routes for a valid session", async ({ page, foodApi }) => {
  const recipeOne = await foodApi.createRecipe({
    title: uniqueName("Smoke Recipe Main"),
    ingredients: [{ ingredientName: "Chicken", quantity: 1, unit: "lb" }],
    steps: [{ instruction: "Cook the chicken." }]
  });
  const recipeTwo = await foodApi.createRecipe({
    title: uniqueName("Smoke Recipe Side"),
    ingredients: [{ ingredientName: "Rice", quantity: 2, unit: "cups" }],
    steps: [{ instruction: "Cook the rice." }]
  });

  const slot = await foodApi.createMealSlot({
    date: new Date().toISOString().slice(0, 10),
    title: uniqueName("Smoke Meal"),
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
