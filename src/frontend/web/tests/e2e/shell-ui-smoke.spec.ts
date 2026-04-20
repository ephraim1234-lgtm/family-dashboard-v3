import { test, expect } from "./fixtures";

test("renders shared shell tabs with the correct active state", async ({ page }) => {
  const primaryNav = page.getByRole("navigation", { name: "Primary" });

  await page.goto("/app");
  await expect(primaryNav.getByRole("link", { name: "Overview", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(primaryNav.getByRole("link", { name: "Food", exact: true })).not.toHaveAttribute("aria-current", "page");
  await expect(primaryNav.getByRole("link", { name: "Admin", exact: true })).not.toHaveAttribute("aria-current", "page");

  await page.goto("/app/food");
  await expect(primaryNav.getByRole("link", { name: "Food", exact: true })).toHaveAttribute("aria-current", "page");

  await page.goto("/admin");
  await expect(primaryNav.getByRole("link", { name: "Admin", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(primaryNav.getByRole("link", { name: "Display", exact: true })).toBeVisible();
});

test("persists the selected theme across reloads", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Choose theme").selectOption("retro");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "retro");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "retro");
});

test("switches through the admin workspace tabs", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByText("Household stats")).toBeVisible();

  await page.getByRole("tab", { name: "Household" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

  await page.getByRole("tab", { name: "Chores" }).click();
  await expect(page.getByText("Chore list")).toBeVisible();
  await expect(page.getByText("Chore completion insights")).toBeVisible();

  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByText(/^Notes$/)).toBeVisible();

  await page.getByRole("tab", { name: "Scheduling" }).click();
  await expect(page.getByText("Linked Google calendars")).toBeVisible();
  await expect(page.getByText("Upcoming household activity")).toBeVisible();
  await expect(page.getByText("Reminder triage")).toBeVisible();

  await page.getByRole("tab", { name: "Display" }).click();
  await expect(page.getByText("Owner-managed devices")).toBeVisible();
});

test("switches through overview tabs while keeping summary panels visible", async ({ page }) => {
  await page.goto("/app");

  await expect(page.getByText("Pantry, planning, and cooking")).toBeVisible();
  await expect(page.getByText("Development session")).toBeVisible();

  await page.getByRole("tab", { name: "Chores" }).click();
  await expect(page.getByRole("heading", { name: "Today's chores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Completed today" })).toBeVisible();
  await expect(page.getByText("Pantry, planning, and cooking")).toBeVisible();
  await expect(page.getByText("Development session")).toBeVisible();

  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByText("Add a note")).toBeVisible();
  await expect(page.getByText("Pantry, planning, and cooking")).toBeVisible();
  await expect(page.getByText("Development session")).toBeVisible();

  await page.getByRole("tab", { name: "Agenda" }).click();
  await expect(page.getByText("Add an event or reminder")).toBeVisible();
  await expect(page.getByText("Pantry, planning, and cooking")).toBeVisible();
  await expect(page.getByText("Development session")).toBeVisible();
});
