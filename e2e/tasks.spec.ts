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

  test("REQ-14: due dates, overdue marking, due-date sort, and persistence across reload", async ({
    page,
  }) => {
    const taskInput = page.getByLabel("Task title");
    const dueInput = page.locator('form[aria-label="Add task"] input[type="date"]');
    const addButton = page.getByRole("button", { name: "Add task" });

    await taskInput.fill("Past due active");
    await dueInput.fill("2000-01-15");
    await addButton.click();

    await taskInput.fill("Due later");
    await dueInput.fill("2099-06-01");
    await addButton.click();

    await taskInput.fill("No due date");
    await dueInput.fill("");
    await addButton.click();

    const pastItem = page
      .getByRole("listitem")
      .filter({ hasText: "Past due active" });
    await expect(pastItem.getByText(/Overdue/i)).toBeVisible();
    await expect(pastItem.getByLabel(/^Due date/)).toContainText("2000-01-15");

    const laterItem = page
      .getByRole("listitem")
      .filter({ hasText: "Due later" });
    await expect(laterItem.getByText(/\bOverdue\b/i)).toHaveCount(0);
    await expect(laterItem.getByLabel(/^Due date/)).toContainText("2099-06-01");

    const noDueItem = page
      .getByRole("listitem")
      .filter({ hasText: "No due date" });
    await expect(noDueItem.getByLabel(/^Due date/)).toHaveCount(0);

    await page.getByRole("button", { name: "Due date", exact: true }).click();

    const titlesAfterSort = await page.locator("ul li span").allTextContents();
    expect(titlesAfterSort).toEqual([
      "Past due active",
      "Due later",
      "No due date",
    ]);

    await page.reload();

    const pastAfter = page
      .getByRole("listitem")
      .filter({ hasText: "Past due active" });
    await expect(pastAfter.getByText(/Overdue/i)).toBeVisible();
    await expect(pastAfter.getByLabel(/^Due date/)).toContainText("2000-01-15");

    await expect(
      page.getByRole("listitem").filter({ hasText: "Due later" }).getByLabel(/^Due date/),
    ).toContainText("2099-06-01");
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: "No due date" })
        .getByLabel(/^Due date/),
    ).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Creation order", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

function gammaItem(page: import("@playwright/test").Page) {
  return page.getByRole("listitem").filter({ hasText: "Gamma" });
}
