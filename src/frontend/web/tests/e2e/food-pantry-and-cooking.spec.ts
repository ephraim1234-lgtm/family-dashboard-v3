import { test, expect, gotoFood, fillAndBlur, uniqueName, useMobileViewport } from "./fixtures";

test("adds and updates a pantry item with search and low-stock filtering", async ({ page, foodApi }) => {
  const pantryItem = uniqueName("Strawberry Yogurt");

  await useMobileViewport(page);
  await gotoFood(page);
  await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to Pantry" }).click();
  await expect(page.getByTestId("food-add-to-pantry-drawer")).toBeVisible();
  await page.getByTestId("food-add-to-pantry-drawer").getByRole("textbox").fill(pantryItem);
  await page.getByTestId("food-add-to-pantry-drawer").getByRole("button", { name: "Add to Pantry" }).click();

  await expect(page.getByTestId("food-alert-success")).toContainText("Pantry item added");
  await foodApi.trackPantryItemByName(pantryItem);

  await page.getByRole("tab", { name: "Pantry" }).click();
  await page.getByRole("textbox", { name: "Pantry search" }).fill(pantryItem);

  const pantryCard = page.locator("[data-testid^='food-pantry-item-']").filter({
    hasText: pantryItem
  }).first();
  await pantryCard.getByRole("button", { name: pantryItem }).click();

  await page.getByTestId("food-pantry-detail").locator("select").nth(1).selectOption({ label: "Low" });
  await page.getByRole("spinbutton").first().fill("1");
  await page.getByTestId("food-pantry-detail-note").fill("Used during QA run");
  await page.getByTestId("food-pantry-save").click();

  await expect(page.getByTestId("food-alert-success")).toContainText("Pantry item updated");

  await page.getByRole("button", { name: "Low Stock" }).click();
  await expect(pantryCard).toContainText(pantryItem);
});

test("adds a recipe to the meal plan and supports slot and recipe removals in planning", async ({ page, foodApi }) => {
  const recipeMain = await foodApi.createRecipe({
    title: uniqueName("Sheet Pan Sausage"),
    ingredients: [{ ingredientName: "Chicken", quantity: 1, unit: "lb" }],
    steps: [{ instruction: "Cook the chicken." }]
  });
  const recipeSide = await foodApi.createRecipe({
    title: uniqueName("Roasted Broccoli"),
    ingredients: [{ ingredientName: "Broccoli", quantity: 2, unit: "heads" }],
    steps: [{ instruction: "Roast the broccoli." }]
  });

  const removableSlot = await foodApi.createMealSlot({
    date: new Date().toISOString().slice(0, 10),
    slotName: "A-Test Dinner",
    title: uniqueName("Sausage and Broccoli Night"),
    recipes: [
      { recipeId: recipeMain.id, role: "Main" },
      { recipeId: recipeSide.id, role: "Side" }
    ]
  });

  await gotoFood(page);
  await page.getByRole("tab", { name: "Recipes" }).click();

  await page.getByTestId("food-recipe-library-search").fill(recipeMain.title);
  await page.getByTestId(`food-recipe-library-view-${recipeMain.id}`).click();
  await expect(page.getByTestId("food-recipe-detail")).toContainText(recipeMain.title);

  await page.getByTestId("food-recipe-add-to-meal").click();
  await expect(page.getByRole("button", { name: "Save to Meal Plan" })).toBeVisible();
  await page.getByRole("button", { name: "Save to Meal Plan" }).click();
  await expect(page.getByTestId("food-alert-success")).toContainText("Recipe added to the meal plan");

  await page.getByRole("tab", { name: "Meals" }).click();
  await expect(page.getByTestId("food-meal-planning")).toBeVisible();
  await page.getByTestId("food-meal-day-date").fill(removableSlot.date ?? new Date().toISOString().slice(0, 10));

  const removableCard = page.getByTestId(`food-meal-slot-${removableSlot.id}`);
  await expect(removableCard).toBeVisible();

  await removableCard.getByRole("button", { name: "Trash" }).nth(2).click();
  await expect(page.locator(".toast")).toContainText(`Removed ${recipeSide.title} from the meal.`);

  await removableCard.getByRole("button", { name: "Trash" }).first().click();
  await expect(page.getByText("Remove meal?")).toBeVisible();
  await page.getByRole("button", { name: "Remove meal" }).click();
  await expect(page.getByTestId(`food-meal-slot-${removableSlot.id}`)).toHaveCount(0);
});

test("confirms purchased shopping items into pantry and preserves cooking mode edits", async ({ page, foodApi }) => {
  const ingredientName = uniqueName("Whole Milk");
  await foodApi.createPantryItem({
    ingredientName,
    quantity: 1,
    unit: "carton"
  });
  await foodApi.createShoppingItem({
    ingredientName,
    quantity: 1,
    unit: "carton"
  });
  await foodApi.createShoppingItem({
    ingredientName: uniqueName("Paper Towels"),
    quantity: 1,
    unit: "pack"
  });

  await gotoFood(page);
  await page.getByRole("tab", { name: "Shopping" }).click();

  const milkRow = page.locator(".stack-card").filter({ hasText: ingredientName }).first();
  await milkRow.getByRole("button", { name: "Bought" }).click();
  await expect(page.getByTestId("food-alert-success")).toContainText("Marked purchased");

  await expect(page.getByRole("button", { name: "Confirm / Complete" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm / Complete" }).click();
  await expect(page.getByTestId("food-post-purchase-confirm")).toBeVisible();
  await expect(page.getByTestId("food-post-purchase-confirm")).toContainText("Merges");
  await page.getByTestId("food-post-purchase-confirm").getByRole("button", { name: "Fridge" }).first().click();
  await page.getByTestId("food-post-purchase-confirm").getByRole("button", { name: "Add to Pantry" }).click();
  await expect(page.getByTestId("food-alert-success")).toContainText("Purchased items moved to pantry");

  const recipe = await foodApi.createRecipe({
    title: uniqueName("Lemon Pasta"),
    ingredients: [{ ingredientName: "Lemon", quantity: 2, unit: "count" }],
    steps: [{ instruction: "Boil the pasta." }]
  });
  const session = await foodApi.startCookingSession({
    recipeId: recipe.id
  });

  await page.goto(`/app/food/cooking/${session.id}`);
  await expect(page.getByTestId("cooking-session-page")).toBeVisible();

  const viewToggle = page.getByRole("button", { name: /Scroll View|Step-by-Step/ });
  if ((await viewToggle.textContent())?.includes("Scroll View")) {
    await viewToggle.click();
  }
  await page.reload();
  await expect(page.getByRole("button", { name: "Step-by-Step" })).toBeVisible();

  await page.getByRole("button", { name: "Edit text" }).first().click();
  const editedInstruction = "Boil the pasta until al dente.";
  await page.getByRole("textbox").last().fill(editedInstruction);
  await page.getByRole("button", { name: "Save" }).last().click();
  await expect(page.locator("[data-testid^='cooking-step-']").first().getByText(editedInstruction)).toBeVisible();

  const firstStep = page.locator("[data-testid^='cooking-step-']").first();
  await firstStep.click();
  await expect(firstStep.getByRole("checkbox")).toBeChecked();

  await page.getByRole("button", { name: "Complete Meal" }).last().click();
  await expect(page.getByText("Complete meal?")).toBeVisible();
  await page.getByRole("button", { name: "Complete Meal" }).last().click();
  await page.waitForURL(/\/app\/food$/);
  await expect(page.getByTestId("food-hub")).toBeVisible();
});
