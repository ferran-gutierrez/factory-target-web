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

  test("REQ-3: Import tasks control uses a JSON-restricted file chooser", async ({
    page,
  }) => {
    const importButton = page.getByRole("button", { name: "Import tasks" });
    await expect(importButton).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    const accept = await fileInput.getAttribute("accept");
    expect(accept).toBeTruthy();
    expect(accept!).toMatch(/\.json|application\/json/i);

    const fileChooserPromise = page.waitForEvent("filechooser");
    await importButton.click();
    await fileChooserPromise;
  });

  test("REQ-10: export, clear storage, import, and confirm restores tasks", async ({
    page,
  }) => {
    const addForm = page.getByRole("form", { name: "Add task" });
    const taskInput = addForm.getByLabel("Task title");
    const dueInput = addForm.getByLabel("Due date");
    const prioritySelect = addForm.getByLabel("Priority");
    const addButton = page.getByRole("button", { name: "Add task" });

    await taskInput.fill("Journey alpha");
    await addButton.click();

    await taskInput.fill("Journey beta");
    await dueInput.fill("2030-08-15");
    await prioritySelect.selectOption({ label: "High" });
    await addButton.click();

    const betaItem = page
      .getByRole("listitem")
      .filter({ hasText: "Journey beta" });
    await betaItem.getByRole("checkbox", { name: "Mark complete" }).check();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export tasks" }).click();
    const download = await downloadPromise;
    const exportPath = await download.path();
    if (!exportPath) {
      throw new Error("Export download path missing");
    }
    const fs = await import("node:fs/promises");
    const exportJson = await fs.readFile(exportPath, "utf-8");
    const exported = JSON.parse(exportJson) as { title: string; completed: boolean }[];
    expect(exported.map((t) => t.title).sort()).toEqual(
      ["Journey alpha", "Journey beta"].sort(),
    );

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByText("Journey alpha")).toHaveCount(0);
    await expect(page.getByText("Journey beta")).toHaveCount(0);

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.accept();
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import tasks" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "tasks-export.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportJson, "utf-8"),
    });

    await expect(page.getByText("Journey alpha")).toBeVisible();
    await expect(page.getByText("Journey beta")).toBeVisible();

    const alphaItem = page
      .getByRole("listitem")
      .filter({ hasText: "Journey alpha" });
    const betaAfter = page
      .getByRole("listitem")
      .filter({ hasText: "Journey beta" });

    await expect(alphaItem.getByRole("checkbox")).not.toBeChecked();
    await expect(betaAfter.getByRole("checkbox")).toBeChecked();

    await expect(alphaItem).toContainText("Normal");
    await expect(alphaItem.getByLabel(/^Due date/)).toHaveCount(0);

    await expect(betaAfter).toContainText("High");
    await expect(betaAfter.getByLabel(/^Due date/)).toContainText("2030-08-15");

    await page.reload();

    const alphaAfterReload = page
      .getByRole("listitem")
      .filter({ hasText: "Journey alpha" });
    const betaAfterReload = page
      .getByRole("listitem")
      .filter({ hasText: "Journey beta" });

    await expect(alphaAfterReload.getByRole("checkbox")).not.toBeChecked();
    await expect(betaAfterReload.getByRole("checkbox")).toBeChecked();
    await expect(alphaAfterReload).toContainText("Normal");
    await expect(alphaAfterReload.getByLabel(/^Due date/)).toHaveCount(0);
    await expect(betaAfterReload).toContainText("High");
    await expect(betaAfterReload.getByLabel(/^Due date/)).toContainText(
      "2030-08-15",
    );

    const reExportedTitles = exported.map((t) => ({
      title: t.title,
      completed: t.completed,
    }));
    expect(reExportedTitles).toEqual(
      expect.arrayContaining([
        { title: "Journey alpha", completed: false },
        { title: "Journey beta", completed: true },
      ]),
    );
  });

  test("REQ-7: export-import journey asserts title, completion, priority, and due date before and after reload", async ({
    page,
  }) => {
    const addForm = page.getByRole("form", { name: "Add task" });
    const taskInput = addForm.getByLabel("Task title");
    const dueInput = addForm.getByLabel("Due date");
    const prioritySelect = addForm.getByLabel("Priority");
    const addButton = page.getByRole("button", { name: "Add task" });

    const activeTitle = "REQ-7 active normal";
    const doneTitle = "REQ-7 done high due";

    await taskInput.fill(activeTitle);
    await addButton.click();

    await taskInput.fill(doneTitle);
    await dueInput.fill("2030-08-15");
    await prioritySelect.selectOption({ label: "High" });
    await addButton.click();

    const doneItem = page.getByRole("listitem").filter({ hasText: doneTitle });
    await doneItem.getByRole("checkbox", { name: "Mark complete" }).check();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export tasks" }).click();
    const download = await downloadPromise;
    const exportPath = await download.path();
    if (!exportPath) {
      throw new Error("Export download path missing");
    }
    const fs = await import("node:fs/promises");
    const exportJson = await fs.readFile(exportPath, "utf-8");

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByText(activeTitle)).toHaveCount(0);
    await expect(page.getByText(doneTitle)).toHaveCount(0);

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.accept();
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import tasks" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "tasks-export.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportJson, "utf-8"),
    });

    const assertImportedTasks = async (): Promise<void> => {
      const activeItem = page
        .getByRole("listitem")
        .filter({ hasText: activeTitle });
      const doneAfterImport = page
        .getByRole("listitem")
        .filter({ hasText: doneTitle });

      await expect(activeItem).toBeVisible();
      await expect(doneAfterImport).toBeVisible();
      await expect(activeItem.getByRole("checkbox")).not.toBeChecked();
      await expect(doneAfterImport.getByRole("checkbox")).toBeChecked();
      await expect(activeItem).toContainText("Normal");
      await expect(activeItem.getByLabel(/^Due date/)).toHaveCount(0);
      await expect(doneAfterImport).toContainText("High");
      await expect(doneAfterImport.getByLabel(/^Due date/)).toContainText(
        "2030-08-15",
      );
    };

    await assertImportedTasks();

    await page.reload();

    await assertImportedTasks();
  });

  test("REQ-9: search combines with filters, no-match message, clear, and reload", async ({
    page,
  }) => {
    const taskInput = page.getByLabel("Task title");
    const addButton = page.getByRole("button", { name: "Add task" });
    const searchInput = page.getByLabel("Search tasks");

    await taskInput.fill("Garden weeds");
    await addButton.click();
    await taskInput.fill("Pay bills");
    await addButton.click();

    const payBillsItem = page
      .getByRole("listitem")
      .filter({ hasText: "Pay bills" });
    await payBillsItem.getByRole("checkbox", { name: "Mark complete" }).check();

    await page.getByRole("button", { name: "Active", exact: true }).click();
    await searchInput.fill("garden");

    await expect(page.getByText("Garden weeds")).toBeVisible();
    await expect(page.getByText("Pay bills")).not.toBeVisible();

    await searchInput.fill("");
    await expect(page.getByText("Garden weeds")).toBeVisible();
    await expect(page.getByText("Pay bills")).not.toBeVisible();

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByText("Garden weeds")).toBeVisible();
    await expect(page.getByText("Pay bills")).toBeVisible();

    await searchInput.fill("xyz");
    await expect(page.getByText("No tasks match")).toBeVisible();
    await expect(page.locator("ul li")).toHaveCount(0);

    await searchInput.fill("");
    await expect(page.getByText("Garden weeds")).toBeVisible();
    await expect(page.getByText("Pay bills")).toBeVisible();

    await page.reload();

    await expect(searchInput).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "All", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Garden weeds")).toBeVisible();
    await expect(page.getByText("Pay bills")).toBeVisible();
  });

  test("REQ-13: priority sort orders high before normal before low after mixed-priority adds", async ({
    page,
  }) => {
    const addForm = page.getByRole("form", { name: "Add task" });
    const taskInput = addForm.getByLabel("Task title");
    const prioritySelect = addForm.getByLabel("Priority");
    const addButton = page.getByRole("button", { name: "Add task" });

    await taskInput.fill("Low first");
    await prioritySelect.selectOption({ label: "Low" });
    await addButton.click();

    await taskInput.fill("High second");
    await prioritySelect.selectOption({ label: "High" });
    await addButton.click();

    await taskInput.fill("High third");
    await prioritySelect.selectOption({ label: "High" });
    await addButton.click();

    await taskInput.fill("Normal third");
    await prioritySelect.selectOption({ label: "Normal" });
    await addButton.click();

    await taskInput.fill("Normal fourth");
    await prioritySelect.selectOption({ label: "Normal" });
    await addButton.click();

    await page.getByRole("button", { name: "Priority", exact: true }).click();

    const titles = await page.locator("ul li span").allTextContents();
    expect(titles).toEqual([
      "High second",
      "High third",
      "Normal third",
      "Normal fourth",
      "Low first",
    ]);
  });
});

function gammaItem(page: import("@playwright/test").Page) {
  return page.getByRole("listitem").filter({ hasText: "Gamma" });
}
