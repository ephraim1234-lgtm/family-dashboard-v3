import { test, expect, gotoFood, uniqueName, useMobileViewport } from "./fixtures";

test("creates a manual recipe and finds it again after reload", async ({ page }) => {
  const recipeTitle = uniqueName("Sunday Buttermilk Pancakes");

  await gotoFood(page);
  await page.getByRole("tab", { name: "Recipes" }).click();
  await page.getByRole("button", { name: "Import Recipe" }).click();
  await page.getByTestId("food-recipe-start-manual").click();

  await page.getByTestId("food-recipe-draft-title").fill(recipeTitle);
  await page.getByTestId("food-recipe-draft-summary").fill("Saved from the household recipe editor.");
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
  await page.getByRole("button", { name: "Library" }).click();
  await page.getByTestId("food-recipe-library-search").fill(recipeTitle);
  const recipeCard = page.locator("[data-testid^='food-recipe-library-item-']").filter({
    hasText: recipeTitle
  });
  await expect(recipeCard).toHaveCount(1);
  await recipeCard.getByRole("button", { name: recipeTitle }).click();
  await expect(page.getByTestId("food-recipe-detail")).toContainText(recipeTitle);
});

test("adds a shopping item and toggles it complete", async ({ page }) => {
  const shoppingItem = uniqueName("Whole Wheat Tortillas");

  await useMobileViewport(page);
  await gotoFood(page);
  await page.getByTestId("food-action-bar").getByRole("button", { name: "Add to List" }).click();
  await expect(page.getByTestId("food-add-to-list-drawer")).toBeVisible();
  await page.getByTestId("food-add-to-list-drawer").getByRole("textbox").nth(0).fill(shoppingItem);
  await page.getByTestId("food-add-to-list-drawer").getByRole("spinbutton").fill("3");
  await page.getByTestId("food-add-to-list-drawer").getByRole("textbox").nth(1).fill("packs");
  await page.getByTestId("food-add-to-list-drawer").getByRole("textbox").nth(2).fill("Wrap night");
  await page.getByTestId("food-add-to-list-drawer").getByRole("button", { name: "Add to List" }).click();

  await expect(page.getByTestId("food-alert-success")).toContainText("Shopping item added");
  await expect(page.getByTestId("food-alert-success")).toBeHidden({ timeout: 5000 });

  await page.getByRole("tab", { name: "Shopping" }).click();

  const itemCard = page.locator(".stack-card").filter({
    hasText: shoppingItem
  });
  await expect(itemCard).toHaveCount(1);

  await itemCard.getByRole("button", { name: "Bought" }).click();
  await expect(page.getByRole("button", { name: "Confirm / Complete" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm / Complete" }).click();
  await expect(page.getByTestId("food-post-purchase-confirm")).toBeVisible();
});
