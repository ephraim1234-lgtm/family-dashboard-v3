import { test, expect, gotoFood, fillAndBlur, uniqueName, useMobileViewport } from "./fixtures";

test("adds and updates a pantry item with visible history", async ({ page }) => {
  const pantryItem = uniqueName("Strawberry Yogurt");

  await useMobileViewport(page);
  await gotoFood(page);
  await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to Pantry" }).click();
  await expect(page.getByTestId("food-add-to-pantry-drawer")).toBeVisible();
  await page.getByTestId("food-add-to-pantry-drawer").getByRole("textbox").fill(pantryItem);
  await page.getByTestId("food-add-to-pantry-drawer").getByRole("button", { name: "Add to Pantry" }).click();

  await expect(page.getByTestId("food-alert-success")).toContainText("Pantry item added");

  await page.getByRole("tab", { name: "Pantry" }).click();

  const pantryCard = page.locator("[data-testid^='food-pantry-item-']").filter({
    hasText: pantryItem
  }).first();
  await pantryCard.getByRole("button", { name: pantryItem }).click();

  await page.getByTestId("food-pantry-detail").locator("select").nth(1).selectOption({ label: "Low" });
  await page.getByRole("spinbutton").first().fill("1");
  await page.getByTestId("food-pantry-detail-note").fill("Used during QA run");
  await page.getByTestId("food-pantry-save").click();

  await expect(page.getByTestId("food-alert-success")).toContainText("Pantry item updated");
  await expect(page.getByTestId("food-pantry-detail")).toContainText("Used during QA run");
});

test("plans a multi-recipe meal, starts cooking, and persists a checked ingredient", async ({ page, foodApi }) => {
  const recipeMain = await foodApi.createRecipe({
    title: uniqueName("Sheet Pan Sausage"),
    ingredients: [{ ingredientName: "Chicken", quantity: 1, unit: "lb" }],
    steps: [{ instruction: "Cook the chicken." }]
  });
  const recipeSide = await foodApi.createRecipe({
    title: uniqueName("Roasted Broccoli"),
    ingredients: [{ ingredientName: "Rice", quantity: 2, unit: "cups" }],
    steps: [{ instruction: "Cook the rice." }]
  });

  const mealTitle = uniqueName("Sausage and Broccoli Night");

  await gotoFood(page);
  await page.getByRole("tab", { name: "Recipes" }).click();

  await page.getByTestId("food-recipe-library-search").fill(recipeMain.title);
  await page.getByTestId(`food-recipe-library-view-${recipeMain.id}`).click();
  await expect(page.getByTestId("food-recipe-detail")).toContainText(recipeMain.title);

  await page.getByTestId("food-recipe-add-to-meal").click();
  await expect(page.getByRole("button", { name: "Save to Meal Plan" })).toBeVisible();
  await page.getByRole("button", { name: "Save to Meal Plan" }).click();
  await expect(page.getByTestId("food-alert-success")).toContainText("Recipe added to the meal plan");

  const slot = await foodApi.createMealSlot({
    date: new Date().toISOString().slice(0, 10),
    title: mealTitle,
    recipes: [
      { recipeId: recipeMain.id, role: "Main" },
      { recipeId: recipeSide.id, role: "Side" }
    ]
  });

  const session = await foodApi.startCookingSession({
    mealPlanSlotId: slot.id
  });

  await page.goto(`/app/food/cooking/${session.id}`);
  await expect(page.getByTestId("cooking-session-page")).toBeVisible();
  await expect(page.getByTestId("cooking-session-title")).toContainText(mealTitle);
  await expect(page.getByRole("button", { name: /Step-by-Step|Scroll/ })).toBeVisible();

  await page.getByTestId(`cooking-switch-recipe-${recipeSide.id}`).click();

  const firstTotalIngredient = page.locator("[data-testid='cooking-total-ingredient']").first();
  const totalIngredientCheckbox = firstTotalIngredient.getByRole("checkbox");
  await totalIngredientCheckbox.click();
  await expect(totalIngredientCheckbox).toBeChecked();

  await page.getByTestId("cooking-ingredients-panel").locator("input[type='checkbox']").first().click();
  const firstActualQuantity = page.locator("[data-testid^='cooking-ingredient-actual-quantity-']").first();
  await fillAndBlur(firstActualQuantity, "1.5");

  await page.reload();
  await expect(page.getByTestId("cooking-session-page")).toBeVisible();
  await expect(page.locator("[data-testid='cooking-total-ingredient']").first().getByRole("checkbox")).toBeChecked();

  await page.getByTestId("cooking-open-tv-mode").click();
  await page.waitForURL(/\/app\/food\/cooking\/.+\/tv$/);
  await expect(page.getByTestId("food-tv-display")).toBeVisible();
  await expect(page.getByTestId("food-tv-title")).toContainText(mealTitle);
});
