import { test, expect, gotoFood, uniqueName, useMobileViewport } from "./fixtures";

const successRecipeTitle = uniqueName("Cleanup Success Recipe");
const successPantryItem = uniqueName("Cleanup Success Pantry");
const successShoppingItem = uniqueName("Cleanup Success Shopping");
const successMealTitle = uniqueName("Cleanup Success Meal");

const failingRecipeTitle = uniqueName("Cleanup Fail Recipe");
const failingPantryItem = uniqueName("Cleanup Fail Pantry");
const failingMealTitle = uniqueName("Cleanup Fail Meal");

test.describe.serial("food e2e cleanup", () => {
  test("removes tracked food data after a passing test", async ({ page, foodApi }) => {
    const recipe = await foodApi.createRecipe({
      title: successRecipeTitle,
      ingredients: [{ ingredientName: "Cleanup Basil", quantity: 1, unit: "bunch" }],
      steps: [{ instruction: "Tidy the basil." }]
    });

    await foodApi.createMealSlot({
      date: new Date().toISOString().slice(0, 10),
      title: successMealTitle,
      recipes: [{ recipeId: recipe.id, role: "Main" }]
    });
    await foodApi.startCookingSession({
      recipeId: recipe.id
    });

    await useMobileViewport(page);
    await gotoFood(page);

    await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to Pantry" }).click();
    await page.getByTestId("food-add-to-pantry-drawer").getByRole("textbox").fill(successPantryItem);
    await page.getByTestId("food-add-to-pantry-drawer").getByRole("button", { name: "Add to Pantry" }).click();
    await expect(page.getByTestId("food-alert-success")).toContainText("Pantry item added");
    await foodApi.trackPantryItemByName(successPantryItem);

    await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to List" }).click();
    await page.getByTestId("food-add-to-list-drawer").getByRole("textbox").nth(0).fill(successShoppingItem);
    await page.getByTestId("food-add-to-list-drawer").getByRole("button", { name: "Add to List" }).click();
    await expect(page.getByTestId("food-alert-success")).toContainText("Shopping item added");
    await foodApi.trackShoppingItemByName(successShoppingItem);
  });

  test("leaves no tracked food data behind after a passing test", async ({ foodApi }) => {
    expect(await foodApi.findRecipeByTitle(successRecipeTitle)).toBeNull();
    expect(await foodApi.findPantryItemByName(successPantryItem)).toBeNull();
    expect(await foodApi.findShoppingItemByName(successShoppingItem)).toBeNull();
    expect(await foodApi.findUpcomingMealByTitle(successMealTitle)).toBeNull();
    expect(await foodApi.findActiveCookingSessionByTitle(successRecipeTitle)).toBeNull();
  });

  test("removes tracked food data after an expected failing test", async ({ page, foodApi }) => {
    test.fail();

    const recipe = await foodApi.createRecipe({
      title: failingRecipeTitle,
      ingredients: [{ ingredientName: "Cleanup Lemon", quantity: 2, unit: "count" }],
      steps: [{ instruction: "This test should fail after creating records." }]
    });

    const slot = await foodApi.createMealSlot({
      date: new Date().toISOString().slice(0, 10),
      title: failingMealTitle,
      recipes: [{ recipeId: recipe.id, role: "Main" }]
    });
    await foodApi.startCookingSession({
      mealPlanSlotId: slot.id
    });

    await useMobileViewport(page);
    await gotoFood(page);

    await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to Pantry" }).click();
    await page.getByTestId("food-add-to-pantry-drawer").getByRole("textbox").fill(failingPantryItem);
    await page.getByTestId("food-add-to-pantry-drawer").getByRole("button", { name: "Add to Pantry" }).click();
    await expect(page.getByTestId("food-alert-success")).toContainText("Pantry item added");
    await foodApi.trackPantryItemByName(failingPantryItem);

    expect(recipe.title).toBe("This intentional mismatch proves teardown runs after failures.");
  });

  test("leaves no tracked food data behind after an expected failing test", async ({ foodApi }) => {
    expect(await foodApi.findRecipeByTitle(failingRecipeTitle)).toBeNull();
    expect(await foodApi.findPantryItemByName(failingPantryItem)).toBeNull();
    expect(await foodApi.findUpcomingMealByTitle(failingMealTitle)).toBeNull();
    expect(await foodApi.findActiveCookingSessionByTitle(failingMealTitle)).toBeNull();
  });
});
