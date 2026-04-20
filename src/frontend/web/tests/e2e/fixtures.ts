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
  await locator.scrollIntoViewIfNeeded();
  await locator.fill(value);
  await locator.blur();
}

export async function useMobileViewport(page: Page) {
  await page.setViewportSize({ width: 393, height: 852 });
}

const FRIENDLY_SUFFIXES = [
  "Maple",
  "Harbor",
  "Meadow",
  "Willow",
  "Cedar",
  "Orchard",
  "River",
  "Juniper",
  "Sparrow",
  "Sunrise",
  "Hearth",
  "Clover"
];

let uniqueCounter = 0;

export function uniqueName(prefix: string) {
  uniqueCounter += 1;
  const suffix = FRIENDLY_SUFFIXES[uniqueCounter % FRIENDLY_SUFFIXES.length];
  const token = (Date.now() + uniqueCounter).toString(36).slice(-4).toUpperCase();
  return `${prefix} ${suffix} ${token}`;
}
