import { expect, test } from "@playwright/test";

test.describe("task list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("declining delete confirmation leaves tasks unchanged", async ({
    page,
  }) => {
    const taskInput = page.getByLabel("Task title");
    await taskInput.fill("Keep this task");
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByText("Keep this task")).toBeVisible();

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.dismiss();
    });

    await page
      .getByRole("listitem")
      .filter({ hasText: "Keep this task" })
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(page.getByText("Keep this task")).toBeVisible();

    const stored = await page.evaluate(() =>
      localStorage.getItem("factory-target-web.tasks"),
    );
    expect(stored).toContain("Keep this task");
  });

  test("full journey with filters, edit, complete, delete, decline, and reload", async ({
    page,
  }) => {
    const taskInput = page.getByLabel("Task title");
    const addButton = page.getByRole("button", { name: "Add task" });

    await taskInput.fill("Alpha");
    await addButton.click();
    await taskInput.fill("Beta");
    await addButton.click();
    await taskInput.fill("Gamma");
    await addButton.click();

    const betaItem = page.getByRole("listitem").filter({ hasText: "Beta" });
    await betaItem.getByRole("button", { name: "Edit" }).click();
    await betaItem.getByLabel("Edit task title").fill("Beta edited");
    await betaItem.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Beta edited")).toBeVisible();

    const alphaItem = page.getByRole("listitem").filter({ hasText: "Alpha" });
    await alphaItem.getByRole("checkbox", { name: "Mark complete" }).check();
    await expect(alphaItem.getByRole("checkbox")).toBeChecked();

    await page.getByRole("button", { name: "Active", exact: true }).click();
    await expect(page.getByText("Alpha")).not.toBeVisible();
    await expect(page.getByText("Beta edited")).toBeVisible();
    await expect(page.getByText("Gamma")).toBeVisible();

    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Beta edited")).not.toBeVisible();

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Beta edited")).toBeVisible();
    await expect(page.getByText("Gamma")).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await gammaItem(page).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Gamma")).not.toBeVisible();

    page.once("dialog", (dialog) => void dialog.dismiss());
    await betaItem.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Beta edited")).toBeVisible();

    expect(await alphaItem.getByRole("checkbox").isChecked()).toBe(true);

    await page.reload();

    await expect(page.getByRole("button", { name: "All", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Beta edited")).toBeVisible();
    await expect(page.getByText("Gamma")).not.toBeVisible();

    const alphaAfter = page.getByRole("listitem").filter({ hasText: "Alpha" });
    await expect(alphaAfter.getByRole("checkbox")).toBeChecked();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Beta edited" }),
    ).toBeVisible();
  });

  test("REQ-3 / REQ-14: due date labels, sort order, edit, clear, and persistence across reload", async ({
    page,
  }) => {
    const addForm = page.getByRole("form", { name: "Add task" });
    const taskInput = addForm.getByLabel("Task title");
    const dueInput = addForm.getByLabel("Due date");
    const addButton = page.getByRole("button", { name: "Add task" });

    const laterTitle = "Task due 2099-06-01";
    const earlierTitle = "Task due 2000-01-15";

    await taskInput.fill(laterTitle);
    await dueInput.fill("2099-06-01");
    await addButton.click();

    await taskInput.fill(earlierTitle);
    await dueInput.fill("2000-01-15");
    await addButton.click();

    const laterItem = page.getByRole("listitem").filter({ hasText: laterTitle });
    const earlierItem = page
      .getByRole("listitem")
      .filter({ hasText: earlierTitle });

    await expect(laterItem.getByText(/Overdue/i)).toHaveCount(0);
    await expect(earlierItem.getByText(/Overdue/i)).toBeVisible();
    await expect(laterItem.getByLabel(/^Due date/)).toContainText("2099-06-01");
    await expect(earlierItem.getByLabel(/^Due date/)).toContainText(
      "2000-01-15",
    );

    await page.getByRole("button", { name: "Due date", exact: true }).click();

    const titlesAfterDueSort = await page.locator("ul li span").allTextContents();
    expect(titlesAfterDueSort.indexOf(earlierTitle)).toBeLessThan(
      titlesAfterDueSort.indexOf(laterTitle),
    );

    await page
      .getByRole("button", { name: "Creation order", exact: true })
      .click();

    const titlesAfterCreationSort = await page
      .locator("ul li span")
      .allTextContents();
    expect(titlesAfterCreationSort.indexOf(laterTitle)).toBeLessThan(
      titlesAfterCreationSort.indexOf(earlierTitle),
    );

    await laterItem.getByRole("button", { name: "Edit" }).click();
    await laterItem.getByLabel("Edit due date").fill("2099-12-31");
    await laterItem.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: laterTitle }).getByLabel(/^Due date/),
    ).toContainText("2099-12-31");

    await earlierItem.getByRole("button", { name: "Edit" }).click();
    await earlierItem.getByRole("button", { name: "Clear due date" }).click();
    await earlierItem.getByRole("button", { name: "Save" }).click();
    const clearedItem = page
      .getByRole("listitem")
      .filter({ hasText: earlierTitle });
    await expect(clearedItem.getByLabel(/^Due date/)).toHaveCount(0);

    await page.reload();

    const laterAfter = page
      .getByRole("listitem")
      .filter({ hasText: laterTitle });
    const earlierAfter = page
      .getByRole("listitem")
      .filter({ hasText: earlierTitle });

    await expect(laterAfter.getByLabel(/^Due date/)).toContainText("2099-12-31");
    await expect(earlierAfter.getByLabel(/^Due date/)).toHaveCount(0);
    await expect(earlierAfter.getByText(/Overdue/i)).toHaveCount(0);

    await expect(
      page.getByRole("button", { name: "Creation order", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

function gammaItem(page: import("@playwright/test").Page) {
  return page.getByRole("listitem").filter({ hasText: "Gamma" });
}
