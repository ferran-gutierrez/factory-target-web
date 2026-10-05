import { expect, test } from "@playwright/test";

test.describe("task title search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("REQ-8: search filters by title, combines with active filter, clears, no-match, and reload", async ({
    page,
  }) => {
    const addForm = page.getByRole("form", { name: "Add task" });
    const taskInput = addForm.getByLabel("Task title");
    const addButton = page.getByRole("button", { name: "Add task" });
    const searchInput = page.getByLabel("Search tasks");

    await taskInput.fill("Cherry task");
    await addButton.click();
    await taskInput.fill("Banana task");
    await addButton.click();
    await taskInput.fill("Apple task");
    await addButton.click();

    await searchInput.fill("apple");
    await expect(page.getByText("Apple task")).toBeVisible();
    await expect(page.getByText("Banana task")).not.toBeVisible();
    await expect(page.getByText("Cherry task")).not.toBeVisible();

    await searchInput.fill("");
    await expect(page.getByText("Apple task")).toBeVisible();
    await expect(page.getByText("Banana task")).toBeVisible();
    await expect(page.getByText("Cherry task")).toBeVisible();

    await searchInput.fill("zzznomatch");
    await expect(page.getByText("No tasks match")).toBeVisible();
    await expect(page.locator("ul li")).toHaveCount(0);

    await searchInput.fill("");
    await expect(page.getByText("Banana task")).toBeVisible();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Banana task" })
      .getByRole("checkbox", { name: "Mark complete" })
      .click();
    await page.getByRole("button", { name: "Active", exact: true }).click();
    await expect(page.getByText("Banana task")).not.toBeVisible();

    await searchInput.fill("task");
    await expect(page.getByText("Cherry task")).toBeVisible();
    await expect(page.getByText("Apple task")).toBeVisible();
    await expect(page.getByText("Banana task")).not.toBeVisible();

    await page.reload();

    await expect(searchInput).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "All", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Cherry task")).toBeVisible();
    await expect(page.getByText("Banana task")).toBeVisible();
    await expect(page.getByText("Apple task")).toBeVisible();
  });
});
