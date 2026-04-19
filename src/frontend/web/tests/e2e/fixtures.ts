import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { FoodApi } from "./helpers/food-api";

type FoodFixtures = {
  foodApi: FoodApi;
};

export const test = base.extend<FoodFixtures>({
  foodApi: async ({ page }, use) => {
    await use(new FoodApi(page.request));
  }
});

export { expect };

export async function gotoFood(page: Page) {
  await page.goto("/app/food");
  await expect(page.getByTestId("food-hub")).toBeVisible();
}

export async function fillAndBlur(locator: Locator, value: string) {
  await locator.fill(value);
  await locator.blur();
}

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
