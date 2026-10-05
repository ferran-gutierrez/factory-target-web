// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import {
  createTaskStore,
  type TaskStore,
} from "../src/taskStore";
import { loadTasks, saveTasks, TASKS_STORAGE_KEY } from "../src/taskPersistence";

function createStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

function mountFreshApp(): HTMLElement {
  document.body.innerHTML = `<main id="app"></main>`;
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("Missing #app");
  }
  mountTaskApp(root);
  return root;
}

function getTaskInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Task title"]',
  );
  if (!input) {
    throw new Error("Task entry control not found");
  }
  return input;
}

function getAddDueDateInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    'form[aria-label="Add task"] input[type="date"]',
  );
  if (!input) {
    throw new Error("Add-task due date control not found");
  }
  return input;
}

function submitTask(title: string, dueDate?: string): void {
  const input = getTaskInput();
  input.value = title;
  if (dueDate !== undefined) {
    getAddDueDateInput().value = dueDate;
  }
  input.form?.requestSubmit();
}

type PriorityLabel = "Low" | "Normal" | "High";

function getAddPrioritySelect(): HTMLSelectElement {
  const select = document.querySelector<HTMLSelectElement>(
    'form[aria-label="Add task"] [aria-label="Priority"]',
  );
  if (!select) {
    throw new Error("Add-task priority control not found");
  }
  return select;
}

function setAddFormPriority(label: PriorityLabel): void {
  const select = getAddPrioritySelect();
  const option = [...select.options].find(
    (o) => o.textContent?.trim() === label,
  );
  if (!option) {
    throw new Error(`Priority option "${label}" not found`);
  }
  select.value = option.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function submitTaskWithPriority(title: string, priority?: PriorityLabel): void {
  if (priority !== undefined) {
    setAddFormPriority(priority);
  }
  submitTaskTitle(title);
}

function rowPriorityLabel(item: HTMLLIElement): HTMLElement | null {
  return (
    item.querySelector('[aria-label^="Priority"]') ??
    [...item.querySelectorAll("span, label")].find((el) =>
      /^(Low|Normal|High)$/.test(el.textContent?.trim() ?? ""),
    ) ??
    null
  );
}

function rowHasHighPriorityHighlight(item: HTMLLIElement): boolean {
  return (
    item.getAttribute("data-priority") === "high" ||
    item.classList.contains("priority-high")
  );
}

function selectSort(
  label: "Creation order" | "Due date" | "Priority",
): void {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === label,
  );
  if (!btn) {
    throw new Error(`Sort control "${label}" not found`);
  }
  btn.click();
}

function submitTaskTitle(title: string): void {
  submitTask(title);
}

function listItemWithTitle(title: string): HTMLLIElement {
  const items = [...document.querySelectorAll<HTMLLIElement>("ul li")];
  const item = items.find((li) => li.textContent?.includes(title));
  if (!item) {
    throw new Error(`List item with title "${title}" not found`);
  }
  return item;
}

function visibleListTitlesInOrder(): string[] {
  return [...document.querySelectorAll<HTMLLIElement>("ul li")].map((li) => {
    const span = li.querySelector("span");
    return span?.textContent ?? "";
  });
}

describe("task store", () => {
  let store: TaskStore;

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    store = createTaskStore();
  });

  it("rejects empty or whitespace-only titles without changing task count", () => {
    expect(store.addTask("")).toBe(false);
    expect(store.addTask("   ")).toBe(false);
    expect(store.addTask("\n\t")).toBe(false);
    expect(store.getTasks()).toHaveLength(0);
  });
});

describe("task app UI — due dates and sort", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    mountFreshApp();
  });

  it("REQ-1: add form includes optional due date and persists selected date on the task row", () => {
    expect(getAddDueDateInput()).toBeInstanceOf(HTMLInputElement);

    submitTask("  Buy milk  ", "2026-04-20");

    const item = listItemWithTitle("Buy milk");
    const dueLabel = item.querySelector('[aria-label^="Due date"]');
    expect(dueLabel?.textContent).toMatch(/2026-04-20/);

    const stored = loadTasks();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(
      expect.objectContaining({
        title: "Buy milk",
        dueDate: "2026-04-20",
      }),
    );
  });

  it("REQ-2: new task without a due date shows no due date on the list row", () => {
    submitTaskTitle("No deadline");

    const item = listItemWithTitle("No deadline");
    expect(item.querySelector('[aria-label^="Due date"]')).toBeNull();
    expect(
      (loadTasks()[0] as { dueDate?: string } | undefined)?.dueDate,
    ).toBeUndefined();
  });

  it("REQ-3: editing can set or change the due date and the list shows the update after save", () => {
    submitTask("Original", "2026-01-10");
    let item = listItemWithTitle("Original");
    [...item.querySelectorAll("button")]
      .find((b) => b.textContent === "Edit")
      ?.click();

    item = listItemWithTitle("Original");
    const dueInput = item.querySelector<HTMLInputElement>('input[type="date"]');
    expect(dueInput).toBeTruthy();
    dueInput!.value = "2026-09-01";
    [...item.querySelectorAll("button")]
      .find((b) => b.textContent === "Save")
      ?.click();

    item = listItemWithTitle("Original");
    expect(item.querySelector('[aria-label^="Due date"]')?.textContent).toMatch(
      /2026-09-01/,
    );
  });

  it("REQ-4: editing can clear an existing due date so the row no longer shows one", () => {
    submitTask("Clear me", "2026-02-02");
    let item = listItemWithTitle("Clear me");
    [...item.querySelectorAll("button")]
      .find((b) => b.textContent === "Edit")
      ?.click();

    item = listItemWithTitle("Clear me");
    const clearBtn = [...item.querySelectorAll("button")].find(
      (b) => b.textContent === "Clear due date",
    );
    expect(clearBtn).toBeTruthy();
    clearBtn?.click();
    [...item.querySelectorAll("button")]
      .find((b) => b.textContent === "Save")
      ?.click();

    item = listItemWithTitle("Clear me");
    expect(item.querySelector('[aria-label^="Due date"]')).toBeNull();
    expect(
      (loadTasks()[0] as { dueDate?: string } | undefined)?.dueDate,
    ).toBeUndefined();
  });

  it("REQ-5: list row exposes due date with accessible labeling tied to the row", () => {
    submitTask("Report", "2026-07-04");
    const item = listItemWithTitle("Report");
    const due = item.querySelector('[aria-label^="Due date"]');
    expect(due).toBeTruthy();
    expect(due?.getAttribute("aria-label")).toMatch(/^Due date/);
    expect(due?.textContent).toMatch(/2026-07-04/);
  });

  it("REQ-6: incomplete task with due date before today is marked overdue in the list", () => {
    submitTask("Late work", "2000-01-01");
    const item = listItemWithTitle("Late work");
    expect(item.textContent).toMatch(/Overdue/i);
  });

  it("REQ-9: creation order sort shows tasks in the order they were added", () => {
    submitTaskTitle("First added");
    submitTaskTitle("Second added");
    submitTaskTitle("Third added");

    selectSort("Due date");
    selectSort("Creation order");

    expect(visibleListTitlesInOrder()).toEqual([
      "First added",
      "Second added",
      "Third added",
    ]);
  });
});

describe("task app UI — core interactions (regression)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    mountFreshApp();
  });

  it("exposes task entry control and adds incomplete task to the list", () => {
    expect(getTaskInput()).toBeInstanceOf(HTMLInputElement);
    expect(document.querySelector('button[type="submit"]')?.textContent).toBe(
      "Add task",
    );

    submitTaskTitle("  Buy milk  ");

    const item = listItemWithTitle("Buy milk");
    expect(
      item.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked,
    ).toBe(false);
    expect(document.querySelectorAll("ul li")).toHaveLength(1);
  });

  it("shows updated title in the list after edit and save", () => {
    submitTaskTitle("Original");
    let item = listItemWithTitle("Original");
    const editBtn = [...item.querySelectorAll("button")].find(
      (b) => b.textContent === "Edit",
    );
    editBtn?.click();

    item = listItemWithTitle("Original");
    const editInput = item.querySelector<HTMLInputElement>(
      'input[id^="edit-task-"]',
    );
    expect(editInput).toBeTruthy();
    editInput!.value = "Updated title";
    const saveBtn = [...item.querySelectorAll("button")].find(
      (b) => b.textContent === "Save",
    );
    saveBtn?.click();

    expect(listItemWithTitle("Updated title")).toBeTruthy();
    expect(document.body.textContent).not.toContain("Original");
  });

  it("presents completed task with checked control", () => {
    submitTaskTitle("Walk dog");
    const item = listItemWithTitle("Walk dog");
    const checkbox = item.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(checkbox).toBeTruthy();

    checkbox!.checked = true;
    checkbox!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(
      item.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked,
    ).toBe(true);
  });

  it("presents active task again when marked not complete", () => {
    submitTaskTitle("Read book");
    const item = listItemWithTitle("Read book");
    const checkbox = item.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    expect(checkbox.checked).toBe(true);

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      item.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked,
    ).toBe(false);
  });

  it("confirms delete, then removes task from list and storage", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    submitTaskTitle("Remove me");
    submitTaskTitle("Keep me");

    const item = listItemWithTitle("Remove me");
    const deleteBtn = [...item.querySelectorAll("button")].find(
      (b) => b.textContent === "Delete",
    );
    deleteBtn?.click();

    expect(window.confirm).toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Remove me");
    expect(listItemWithTitle("Keep me")).toBeTruthy();

    const persisted = loadTasks();
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.title).toBe("Keep me");
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBeTruthy();
  });
});

describe("task app UI — priority", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    mountFreshApp();
  });

  it("REQ-1: add form exposes Priority control defaulting to Normal with Low and High options", () => {
    const select = getAddPrioritySelect();
    expect(select.tagName).toBe("SELECT");

    const labels = [...select.options].map((o) => o.textContent?.trim());
    expect(labels).toEqual(["Low", "Normal", "High"]);

    const selected = select.options[select.selectedIndex];
    expect(selected?.textContent?.trim()).toBe("Normal");
  });

  it("REQ-2: default Normal priority on add stores and displays normal priority", () => {
    submitTaskTitle("Default priority task");

    const item = listItemWithTitle("Default priority task");
    expect(item.textContent).toMatch(/Normal/);
    expect(rowPriorityLabel(item)?.textContent?.trim()).toBe("Normal");

    const stored = loadTasks();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(
      expect.objectContaining({
        title: "Default priority task",
        priority: "normal",
      }),
    );
  });

  it("REQ-3: choosing High or Low on add creates task with that priority", () => {
    submitTaskWithPriority("Urgent work", "High");
    submitTaskWithPriority("Nice to have", "Low");

    expect(listItemWithTitle("Urgent work").textContent).toMatch(/High/);
    expect(listItemWithTitle("Nice to have").textContent).toMatch(/Low/);

    const stored = loadTasks();
    expect(stored.find((t) => t.title === "Urgent work")).toEqual(
      expect.objectContaining({ priority: "high" }),
    );
    expect(stored.find((t) => t.title === "Nice to have")).toEqual(
      expect.objectContaining({ priority: "low" }),
    );
  });

  it("REQ-4: edit priority control updates displayed priority after save", () => {
    submitTaskTitle("Change me");
    let item = listItemWithTitle("Change me");
    [...item.querySelectorAll("button")]
      .find((b) => b.textContent === "Edit")
      ?.click();

    item = listItemWithTitle("Change me");
    const prioritySelect = item.querySelector<HTMLSelectElement>(
      '[aria-label="Edit priority"]',
    );
    expect(prioritySelect).toBeTruthy();
    const highOption = [...prioritySelect!.options].find(
      (o) => o.textContent?.trim() === "High",
    );
    expect(highOption).toBeTruthy();
    prioritySelect!.value = highOption!.value;
    prioritySelect!.dispatchEvent(new Event("change", { bubbles: true }));
    [...item.querySelectorAll("button")]
      .find((b) => b.textContent === "Save")
      ?.click();

    item = listItemWithTitle("Change me");
    expect(item.textContent).toMatch(/High/);
    expect(
      (loadTasks().find((t) => t.title === "Change me") as { priority?: string })
        ?.priority,
    ).toBe("high");
  });

  it("REQ-5: list row exposes current priority with accessible labeling", () => {
    submitTaskWithPriority("Labeled", "Low");
    const item = listItemWithTitle("Labeled");
    const marker = rowPriorityLabel(item);
    expect(marker).toBeTruthy();
    const aria = marker?.getAttribute("aria-label");
    if (aria) {
      expect(aria).toMatch(/^Priority/);
    }
    expect(item.textContent).toMatch(/Low/);
  });

  it("REQ-6: high-priority row is visibly highlighted for tests", () => {
    submitTaskWithPriority("Critical", "High");
    const item = listItemWithTitle("Critical");
    expect(rowHasHighPriorityHighlight(item)).toBe(true);
  });

  it("REQ-7: normal and low priority rows do not use high-priority highlight", () => {
    submitTaskWithPriority("Routine", "Normal");
    submitTaskWithPriority("Optional", "Low");

    expect(rowHasHighPriorityHighlight(listItemWithTitle("Routine"))).toBe(
      false,
    );
    expect(rowHasHighPriorityHighlight(listItemWithTitle("Optional"))).toBe(
      false,
    );
  });

  it("REQ-8: sort control offers Priority alongside Creation order and Due date", () => {
    const sortLabels = [...document.querySelectorAll("button")]
      .map((b) => b.textContent?.trim())
      .filter((t) =>
        ["Creation order", "Due date", "Priority"].includes(t ?? ""),
      );
    expect(sortLabels).toEqual(["Creation order", "Due date", "Priority"]);
  });
});
