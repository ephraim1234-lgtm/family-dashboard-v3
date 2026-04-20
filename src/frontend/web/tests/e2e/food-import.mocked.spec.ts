import { test, expect, gotoFood, uniqueName } from "./fixtures";

test("imports a mocked recipe review into the editable draft workflow", async ({ page }) => {
  const recipeTitle = uniqueName("Mock Imported Recipe");

  await page.route("**/api/food/recipe-imports", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        importJobId: "11111111-1111-1111-1111-111111111111",
        status: "Parsed",
        parserConfidence: 0.98,
        sourceUrl: "https://example.com/mock-import",
        sourceSiteName: "Example Recipes",
        title: recipeTitle,
        summary: "Imported through a mocked Playwright route.",
        yieldText: "4 servings",
        ingredients: [
          {
            ingredientName: "Tomatoes",
            quantity: 2,
            unit: "count",
            preparation: null,
            isOptional: false
          }
        ],
        steps: [
          {
            position: 1,
            instruction: "Mix everything together."
          }
        ],
        warnings: []
      })
    });
  });

  await gotoFood(page);
  await page.getByRole("tab", { name: "Recipes" }).click();
  await page.getByTestId("food-import-url").fill("https://example.com/mock-import");
  await page.getByTestId("food-import-submit").click();

  await expect(page.getByTestId("food-import-review")).toContainText("Parsed");
  await expect(page.getByTestId("food-recipe-draft")).toContainText("Review imported recipe");
  await expect(page.getByTestId("food-recipe-draft-title")).toHaveValue(recipeTitle);
  await expect(page.getByTestId("food-recipe-ingredient-name-0")).toHaveValue("Tomatoes");
  await expect(page.getByTestId("food-recipe-step-instruction-0")).toHaveValue("Mix everything together.");
});

test("shows stable error feedback when mocked import fails", async ({ page }) => {
  await page.route("**/api/food/recipe-imports", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "text/plain",
      body: "Mocked import failure"
    });
  });

  await gotoFood(page);
  await page.getByRole("tab", { name: "Recipes" }).click();
  await page.getByTestId("food-import-url").fill("https://example.com/bad-import");
  await page.getByTestId("food-import-submit").click();

  await expect(page.getByTestId("food-alert-error")).toContainText("Mocked import failure");
});
