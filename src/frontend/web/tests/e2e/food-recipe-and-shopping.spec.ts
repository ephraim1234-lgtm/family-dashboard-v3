import { test, expect, gotoFood, uniqueName } from "./fixtures";

test("creates a manual recipe and finds it again after reload", async ({ page }) => {
  const recipeTitle = uniqueName("Playwright Manual Recipe");

  await gotoFood(page);
  await page.getByRole("tab", { name: "Recipes" }).click();
  await page.getByTestId("food-recipe-start-manual").click();

  await page.getByTestId("food-recipe-draft-title").fill(recipeTitle);
  await page.getByTestId("food-recipe-draft-summary").fill("Saved from Playwright.");
  await page.getByTestId("food-recipe-draft-yield").fill("6 servings");
  await page.getByTestId("food-recipe-ingredient-name-0").fill("Flour");
  await page.getByTestId("food-recipe-ingredient-quantity-0").fill("2");
  await page.getByTestId("food-recipe-ingredient-unit-0").fill("cups");
  await page.getByTestId("food-recipe-step-instruction-0").fill("Whisk everything together.");

  await page.getByTestId("food-recipe-save").click();

  await expect(page.getByTestId("food-alert-success")).toContainText("Recipe saved");

  await page.reload();
  await expect(page.getByTestId("food-hub")).toBeVisible();
  await page.getByRole("tab", { name: "Recipes" }).click();
  await page.getByRole("tab", { name: "Library" }).click();
  await page.getByTestId("food-recipe-library-search").fill(recipeTitle);
  const recipeCard = page.locator("[data-testid^='food-recipe-library-item-']").filter({
    hasText: recipeTitle
  });
  await expect(recipeCard).toHaveCount(1);
  await recipeCard.getByRole("button", { name: "Open recipe" }).click();
  await expect(page.getByTestId("food-recipe-detail")).toContainText(recipeTitle);
});

test("adds a shopping item and toggles it complete", async ({ page }) => {
  const shoppingItem = uniqueName("Playwright Shopping Item");

  await gotoFood(page);
  await page.getByRole("tab", { name: "Shopping" }).click();

  await page.getByTestId("food-shopping-add-item").fill(shoppingItem);
  await page.getByTestId("food-shopping-add-quantity").fill("3");
  await page.getByTestId("food-shopping-add-unit").fill("bags");
  await page.getByTestId("food-shopping-add-notes").fill("Bulk aisle");
  await page.getByTestId("food-shopping-add-submit").click();

  await expect(page.getByTestId("food-alert-success")).toContainText("Shopping item added");
  await expect(page.getByTestId("food-alert-success")).toBeHidden({ timeout: 5000 });

  const itemCard = page.locator("[data-testid^='food-shopping-item-']").filter({
    hasText: shoppingItem
  });
  await expect(itemCard).toHaveCount(1);

  await itemCard.getByRole("checkbox").click();
  await page.getByRole("tab", { name: "Pantry" }).click();
  await expect(page.getByTestId("food-pantry-panel")).toContainText(shoppingItem);
});
