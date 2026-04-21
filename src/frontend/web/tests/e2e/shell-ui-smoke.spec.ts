import { test, expect } from "./fixtures";

test("renders shared shell tabs with the correct active state", async ({ page }) => {
  const primaryNav = page.getByRole("navigation", { name: "Primary" });

  await page.goto("/app");
  await expect(primaryNav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await expect(primaryNav.getByRole("link", { name: "Food" })).not.toHaveAttribute("aria-current", "page");
  await expect(primaryNav.getByRole("link", { name: "Admin" })).not.toHaveAttribute("aria-current", "page");

  await page.goto("/app/food");
  await expect(primaryNav.getByRole("link", { name: "Food" })).toHaveAttribute("aria-current", "page");

  await page.goto("/admin");
  await expect(primaryNav.getByRole("link", { name: "Admin" })).toHaveAttribute("aria-current", "page");
  await expect(primaryNav.getByRole("link", { name: "Display" })).toHaveCount(0);
});

test("keeps display kiosk-only without the shared shell", async ({ page }) => {
  await page.goto("/display");

  await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
  await expect(page.getByText("Household control center")).toHaveCount(0);
});

test("uses a neutral shell without theme switching", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByLabel("Choose theme")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("loads overview workspace from the query string and preserves secondary panels", async ({ page }) => {
  await page.goto("/app?workspace=agenda");

  await expect(page.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Add an event or reminder")).toBeVisible();
  await expect(page.getByText("Pantry, planning, and cooking")).toBeVisible();
  await expect(page.getByText("Development session")).toBeVisible();

  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page).toHaveURL(/\/app\?workspace=notes/);
  await expect(page.getByText("Add a note")).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/app\?workspace=notes/);
  await expect(page.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
});

test("switches through the admin workspace tabs with URL persistence", async ({ page }) => {
  await page.goto("/admin?workspace=scheduling");

  await expect(page.getByRole("tab", { name: "Scheduling" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Linked Google calendars")).toBeVisible();
  await expect(page.getByText("Upcoming household activity")).toBeVisible();
  await expect(page.getByText("Reminder triage")).toBeVisible();

  await page.getByRole("tab", { name: "Display" }).click();
  await expect(page).toHaveURL(/\/admin\?workspace=display/);
  await expect(page.getByText("Owner-managed devices")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/admin\?workspace=scheduling/);
  await expect(page.getByRole("tab", { name: "Scheduling" })).toHaveAttribute("aria-selected", "true");
});

test("food hub still renders inside the shared shell", async ({ page }) => {
  await page.goto("/app/food");

  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByTestId("food-hub")).toBeVisible();
});
