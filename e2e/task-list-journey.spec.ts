import { expect, test } from "@playwright/test";

test.describe("task list journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("home page renders task controls (REQ-1)", async ({ page }) => {
    await expect(page.getByRole("textbox", { name: /task title/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^all$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^active$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^done$/i })).toBeVisible();
    await expect(page.getByRole("list", { name: /tasks/i })).toBeVisible();
  });

  test("full journey: add, edit, complete, filter, delete, reload (REQ-2–REQ-13)", async ({
    page,
  }) => {
    const titleInput = page.getByRole("textbox", { name: /task title/i });
    const addButton = page.getByRole("button", { name: /^add$/i });
    const taskList = page.getByRole("list", { name: /tasks/i });
    const emptyState = page.getByRole("status");

    await titleInput.fill("Buy groceries");
    await addButton.click();
    await titleInput.fill("Walk the dog");
    await addButton.click();
    await titleInput.fill("Read a book");
    await addButton.click();

    await expect(taskList.getByRole("listitem")).toHaveCount(3);
    await expect(taskList.getByText("Buy groceries")).toBeVisible();

    const dogItem = taskList.getByRole("listitem").filter({ hasText: "Walk the dog" });
    await dogItem.getByRole("button", { name: /^edit$/i }).click();
    await dogItem.getByRole("textbox", { name: /task title/i }).fill("Walk the puppy");
    await dogItem.getByRole("button", { name: /^save$/i }).click();
    await expect(taskList.getByText("Walk the puppy")).toBeVisible();

    await page.getByRole("button", { name: /^done$/i }).click();
    await expect(taskList.getByRole("listitem")).toHaveCount(0);
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(/add/i);
    await expect(emptyState).toContainText(/task/i);

    await page.getByRole("button", { name: /^all$/i }).click();
    await expect(taskList.getByRole("listitem")).toHaveCount(3);

    const groceriesItem = taskList
      .getByRole("listitem")
      .filter({ hasText: "Buy groceries" });
    await groceriesItem.getByRole("checkbox").check();
    await expect(groceriesItem.getByRole("checkbox")).toBeChecked();
    await groceriesItem.getByRole("checkbox").uncheck();
    await expect(groceriesItem.getByRole("checkbox")).not.toBeChecked();
    await groceriesItem.getByRole("checkbox").check();

    await page.getByRole("button", { name: /^all$/i }).click();
    await expect(taskList.getByRole("listitem")).toHaveCount(3);

    await page.getByRole("button", { name: /^active$/i }).click();
    await expect(taskList.getByRole("listitem")).toHaveCount(2);
    await expect(taskList.getByText("Buy groceries")).toHaveCount(0);

    await page.getByRole("button", { name: /^done$/i }).click();
    await expect(taskList.getByRole("listitem")).toHaveCount(1);
    await expect(taskList.getByText("Buy groceries")).toBeVisible();

    await page.getByRole("button", { name: /^all$/i }).click();

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.dismiss();
    });
    const bookItem = taskList.getByRole("listitem").filter({ hasText: "Read a book" });
    await bookItem.getByRole("button", { name: /^delete$/i }).click();
    await expect(taskList.getByText("Read a book")).toBeVisible();

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.accept();
    });
    await bookItem.getByRole("button", { name: /^delete$/i }).click();
    await expect(taskList.getByText("Read a book")).toHaveCount(0);
    await expect(taskList.getByRole("listitem")).toHaveCount(2);

    await page.reload();
    await expect(taskList.getByRole("listitem")).toHaveCount(2);
    await expect(taskList.getByText("Buy groceries")).toBeVisible();
    await expect(taskList.getByText("Walk the puppy")).toBeVisible();
    await expect(taskList.getByText("Read a book")).toHaveCount(0);

    const reloadedGroceries = taskList
      .getByRole("listitem")
      .filter({ hasText: "Buy groceries" });
    await expect(reloadedGroceries.getByRole("checkbox")).toBeChecked();

    await page.getByRole("button", { name: /^active$/i }).click();
    await expect(taskList.getByRole("listitem")).toHaveCount(1);
    await expect(taskList.getByText("Walk the puppy")).toBeVisible();
  });
});
