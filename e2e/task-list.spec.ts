import { expect, test, type Locator, type Page } from "@playwright/test";

const STORAGE_KEY = "factory-target-web:tasks";

async function newTaskInput(page: Page): Promise<Locator> {
  const byLabel = page.getByLabel(/task/i);
  if ((await byLabel.count()) > 0) {
    return byLabel.first();
  }
  const byPlaceholder = page.getByPlaceholder(/task/i);
  if ((await byPlaceholder.count()) > 0) {
    return byPlaceholder.first();
  }
  return page.getByRole("textbox").first();
}

async function addTaskButton(page: Page): Promise<Locator> {
  return page.getByRole("button", { name: /^add$/i });
}

async function addTask(page: Page, title: string): Promise<void> {
  const input = await newTaskInput(page);
  await input.fill(title);
  await (await addTaskButton(page)).click();
}

function taskRow(page: Page, title: string): Locator {
  return page.getByRole("listitem").filter({ hasText: title });
}

async function setFilter(page: Page, name: "All" | "Active" | "Done"): Promise<Locator> {
  const control = page.getByRole("button", { name, exact: true });
  await control.click();
  return control;
}

async function expectFilterSelected(filterControl: Locator): Promise<void> {
  await expect(filterControl).toBeVisible();
  const ariaPressed = await filterControl.getAttribute("aria-pressed");
  const ariaCurrent = await filterControl.getAttribute("aria-current");
  const ariaChecked = await filterControl.getAttribute("aria-checked");
  const selected =
    ariaPressed === "true" || ariaCurrent === "true" || ariaCurrent === "page" || ariaChecked === "true";
  expect(selected).toBe(true);
}

test.describe("task list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
  });

  test("REQ-1: home page shows new-task field and add control", async ({ page }) => {
    await expect(await newTaskInput(page)).toBeVisible();
    await expect(await addTaskButton(page)).toBeVisible();
  });

  test("REQ-2: adding a trimmed title shows one incomplete task", async ({ page }) => {
    await addTask(page, "  Write tests  ");

    const row = taskRow(page, "Write tests");
    await expect(row).toBeVisible();
    await expect(row.getByRole("checkbox")).not.toBeChecked();
  });

  test("REQ-2: Enter in the new-task field adds a task like the Add button", async ({ page }) => {
    const input = await newTaskInput(page);
    await input.fill("  Press enter  ");
    await input.press("Enter");

    const row = taskRow(page, "Press enter");
    await expect(row).toBeVisible();
    await expect(row.getByRole("checkbox")).not.toBeChecked();
  });

  test("REQ-4: inline edit commits trimmed title via Save", async ({ page }) => {
    await addTask(page, "Draft spec");

    const row = taskRow(page, "Draft spec");
    await row.getByRole("button", { name: /^edit$/i }).click();
    const editor = row.getByRole("textbox");
    await editor.fill("  Final spec  ");
    await row.getByRole("button", { name: /^save$/i }).click();

    await expect(taskRow(page, "Final spec")).toBeVisible();
    await expect(taskRow(page, "Draft spec")).toHaveCount(0);
  });

  test("REQ-4: inline edit commits on Enter", async ({ page }) => {
    await addTask(page, "Rename me");

    const row = taskRow(page, "Rename me");
    await row.getByRole("button", { name: /^edit$/i }).click();
    const editor = row.getByRole("textbox");
    await editor.fill("Renamed");
    await editor.press("Enter");

    await expect(taskRow(page, "Renamed")).toBeVisible();
  });

  test("REQ-4: Escape cancels inline edit without changing title", async ({ page }) => {
    await addTask(page, "Keep title");

    const row = taskRow(page, "Keep title");
    await row.getByRole("button", { name: /^edit$/i }).click();
    const editor = row.getByRole("textbox");
    await editor.fill("Discarded change");
    await editor.press("Escape");

    await expect(taskRow(page, "Keep title")).toBeVisible();
    await expect(taskRow(page, "Discarded change")).toHaveCount(0);
  });

  test("REQ-5: user can mark a task complete", async ({ page }) => {
    await addTask(page, "Finish feature");

    const row = taskRow(page, "Finish feature");
    const checkbox = row.getByRole("checkbox");
    await checkbox.check();

    await expect(checkbox).toBeChecked();
  });

  test("REQ-7: completion checkbox reflects task state", async ({ page }) => {
    await addTask(page, "Track state");

    const row = taskRow(page, "Track state");
    const checkbox = row.getByRole("checkbox");
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("REQ-8: delete opens confirmation before removal", async ({ page }) => {
    await addTask(page, "Do not remove yet");

    let dialogSeen = false;
    page.once("dialog", (dialog) => {
      dialogSeen = true;
      expect(dialog.type()).toBe("confirm");
      void dialog.dismiss();
    });

    await taskRow(page, "Do not remove yet").getByRole("button", { name: /^delete$/i }).click();
    expect(dialogSeen).toBe(true);
  });

  test("REQ-9: dismissing delete confirmation keeps the task", async ({ page }) => {
    await addTask(page, "Stay here");

    page.once("dialog", (dialog) => dialog.dismiss());

    const row = taskRow(page, "Stay here");
    await row.getByRole("button", { name: /^delete$/i }).click();

    await expect(row).toBeVisible();
    await expect(row.getByRole("checkbox")).not.toBeChecked();
  });

  test("REQ-10: accepting delete confirmation removes the task", async ({ page }) => {
    await addTask(page, "Remove me");

    page.once("dialog", (dialog) => dialog.accept());

    await taskRow(page, "Remove me").getByRole("button", { name: /^delete$/i }).click();

    await expect(taskRow(page, "Remove me")).toHaveCount(0);

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEY,
    );
    expect(stored).toBeTruthy();
    const tasks = JSON.parse(stored!) as { title: string }[];
    expect(tasks.some((t) => t.title === "Remove me")).toBe(false);
  });

  test("REQ-11: filter control shows All, Active, and Done with visible selection", async ({
    page,
  }) => {
    const all = page.getByRole("button", { name: "All", exact: true });
    const active = page.getByRole("button", { name: "Active", exact: true });
    const done = page.getByRole("button", { name: "Done", exact: true });

    await expect(all).toBeVisible();
    await expect(active).toBeVisible();
    await expect(done).toBeVisible();

    await expectFilterSelected(all);

    await setFilter(page, "Active");
    await expectFilterSelected(active);

    await setFilter(page, "Done");
    await expectFilterSelected(done);
  });

  test("REQ-12: All filter shows every stored task", async ({ page }) => {
    await addTask(page, "Alpha");
    await addTask(page, "Beta");
    const betaRow = taskRow(page, "Beta");
    await betaRow.getByRole("checkbox").check();

    await setFilter(page, "All");

    await expect(taskRow(page, "Alpha")).toBeVisible();
    await expect(taskRow(page, "Beta")).toBeVisible();
  });

  test("REQ-13: Active filter hides completed tasks", async ({ page }) => {
    await addTask(page, "Open work");
    await addTask(page, "Closed work");
    await taskRow(page, "Closed work").getByRole("checkbox").check();

    await setFilter(page, "Active");

    await expect(taskRow(page, "Open work")).toBeVisible();
    await expect(taskRow(page, "Closed work")).toHaveCount(0);
  });

  test("REQ-14: Done filter hides incomplete tasks", async ({ page }) => {
    await addTask(page, "Still going");
    await addTask(page, "Already done");
    await taskRow(page, "Already done").getByRole("checkbox").check();

    await setFilter(page, "Done");

    await expect(taskRow(page, "Already done")).toBeVisible();
    await expect(taskRow(page, "Still going")).toHaveCount(0);
  });

  test("REQ-15: empty filter results show guidance to add or change filter", async ({ page }) => {
    await addTask(page, "Only done");
    await taskRow(page, "Only done").getByRole("checkbox").check();

    await setFilter(page, "Active");

    await expect(page.getByText(/add.*task|change.*filter|adjust.*filter|filter/i)).toBeVisible();
  });

  test("REQ-17: restores valid tasks from localStorage on load", async ({ page }) => {
    await page.addInitScript(
      ({ key, payload }) => {
        localStorage.setItem(key, payload);
      },
      {
        key: STORAGE_KEY,
        payload: JSON.stringify([
          { id: "seed-1", title: "Persisted active", completed: false },
          { id: "seed-2", title: "Persisted done", completed: true },
        ]),
      },
    );

    await page.goto("/");

    await expect(taskRow(page, "Persisted active")).toBeVisible();
    await expect(taskRow(page, "Persisted done")).toBeVisible();
    await expect(taskRow(page, "Persisted done").getByRole("checkbox")).toBeChecked();
  });

  test("REQ-18: full journey with filters, edit, complete, delete, and reload persistence", async ({
    page,
  }) => {
    await addTask(page, "Task A");
    await addTask(page, "Task B");
    await addTask(page, "Task C");

    const rowB = taskRow(page, "Task B");
    await rowB.getByRole("button", { name: /^edit$/i }).click();
    await rowB.getByRole("textbox").fill("Task B edited");
    await rowB.getByRole("button", { name: /^save$/i }).click();

    await taskRow(page, "Task A").getByRole("checkbox").check();

    await setFilter(page, "Active");
    await expect(taskRow(page, "Task B edited")).toBeVisible();
    await expect(taskRow(page, "Task C")).toBeVisible();
    await expect(taskRow(page, "Task A")).toHaveCount(0);

    await setFilter(page, "Done");
    await expect(taskRow(page, "Task A")).toBeVisible();
    await expect(taskRow(page, "Task B edited")).toHaveCount(0);

    await setFilter(page, "All");

    page.once("dialog", (dialog) => dialog.accept());
    await taskRow(page, "Task C").getByRole("button", { name: /^delete$/i }).click();
    await expect(taskRow(page, "Task C")).toHaveCount(0);

    await page.reload();

    await expect(taskRow(page, "Task A")).toBeVisible();
    await expect(taskRow(page, "Task A").getByRole("checkbox")).toBeChecked();
    await expect(taskRow(page, "Task B edited")).toBeVisible();
    await expect(taskRow(page, "Task B edited").getByRole("checkbox")).not.toBeChecked();
    await expect(taskRow(page, "Task C")).toHaveCount(0);
  });
});
