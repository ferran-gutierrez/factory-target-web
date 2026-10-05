// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assignFileToInput, ensureDataTransfer } from "./dataTransferPolyfill";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import {
  loadTasks,
  saveTasks,
  TASKS_STORAGE_KEY,
} from "../src/taskPersistence";

type TaskWithDue = Task & { dueDate?: string };
type TaskWithPriority = Task & { priority?: "low" | "normal" | "high" };

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

function mountFreshApp(): void {
  document.body.innerHTML = `<main id="app"></main>`;
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("Missing #app");
  }
  mountTaskApp(root);
}

function submitTask(title: string, dueDate?: string): void {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Task title"]',
  );
  if (!input) {
    throw new Error("Task entry control not found");
  }
  input.value = title;
  if (dueDate !== undefined) {
    const dueInput = document.querySelector<HTMLInputElement>(
      'form[aria-label="Add task"] input[type="date"]',
    );
    if (!dueInput) {
      throw new Error("Add-task due date control not found");
    }
    dueInput.value = dueDate;
  }
  input.form?.requestSubmit();
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

function seedMixedValidInvalidStorage(): void {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify([
      { id: "keep-1", title: "Keep me", completed: false },
      { title: "missing id" },
    ]),
  );
}

function skipNoticeElement(): HTMLElement | null {
  return document.querySelector('[role="status"]');
}

function skipNoticeText(): string | null {
  const el = skipNoticeElement();
  if (!el || el.hasAttribute("hidden")) {
    return null;
  }
  const text = el.textContent?.trim();
  return text && text.length > 0 ? text : null;
}

describe("task persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  it("persists tasks in localStorage and restores titles and completion", () => {
    const tasks: Task[] = [
      { id: "id-1", title: "First", completed: false, priority: "normal" },
      { id: "id-2", title: "Second", completed: true, priority: "normal" },
    ];

    saveTasks(tasks);

    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(
      JSON.stringify(tasks),
    );

    const restored = loadTasks();

    expect(restored).toEqual(tasks);
  });

  it("missing or corrupt storage starts from an empty list", () => {
    expect(loadTasks()).toEqual([]);

    localStorage.setItem(TASKS_STORAGE_KEY, "{not-json");
    expect(loadTasks()).toEqual([]);

    localStorage.setItem(TASKS_STORAGE_KEY, '{"wrong":true}');
    expect(loadTasks()).toEqual([]);
  });

  it("full page reload restores tasks in the app UI", () => {
    mountFreshApp();
    submitTaskTitle("First");
    submitTaskTitle("Second");

    const secondItem = listItemWithTitle("Second");
    const checkbox = secondItem.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));

    mountFreshApp();

    expect(
      listItemWithTitle("First").querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )?.checked,
    ).toBe(false);
    expect(
      listItemWithTitle("Second").querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )?.checked,
    ).toBe(true);
  });

  it("REQ-11: persisted JSON includes optional dueDate when set", () => {
    const tasks: TaskWithDue[] = [
      {
        id: "a",
        title: "With date",
        completed: false,
        dueDate: "2026-03-01",
        priority: "normal",
      },
      { id: "b", title: "Without", completed: false, priority: "normal" },
    ];

    saveTasks(tasks);

    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    expect(raw).toContain('"dueDate":"2026-03-01"');
    expect(loadTasks()).toEqual(tasks);
  });

  it("REQ-11: reload restores due dates and overdue marking for active past-due tasks", () => {
    mountFreshApp();
    submitTask("Overdue item", "2000-06-01");
    submitTask("Future item", "2099-12-31");
    submitTask("No date item");

    mountFreshApp();

    const overdueRow = listItemWithTitle("Overdue item");
    expect(overdueRow.textContent).toMatch(/Overdue/i);
    expect(
      overdueRow.querySelector('[aria-label^="Due date"]')?.textContent,
    ).toMatch(/2000-06-01/);

    const futureRow = listItemWithTitle("Future item");
    expect(futureRow.textContent).not.toMatch(/\bOverdue\b/i);
    expect(
      futureRow.querySelector('[aria-label^="Due date"]')?.textContent,
    ).toMatch(/2099-12-31/);

    expect(
      listItemWithTitle("No date item").querySelector(
        '[aria-label^="Due date"]',
      ),
    ).toBeNull();

    const restored = loadTasks() as TaskWithDue[];
    expect(restored.find((t) => t.title === "Overdue item")?.dueDate).toBe(
      "2000-06-01",
    );
    expect(restored.find((t) => t.title === "Future item")?.dueDate).toBe(
      "2099-12-31",
    );
    expect(restored.find((t) => t.title === "No date item")?.dueDate).toBe(
      undefined,
    );
  });

  it("REQ-11: completed past-due task is not marked overdue after reload", () => {
    mountFreshApp();
    submitTask("Done but late", "1999-01-01");
    const item = listItemWithTitle("Done but late");
    const checkbox = item.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));

    mountFreshApp();

    const reloaded = listItemWithTitle("Done but late");
    expect(reloaded.textContent).not.toMatch(/\bOverdue\b/i);
    expect(
      reloaded.querySelector('[aria-label^="Due date"]')?.textContent,
    ).toMatch(/1999-01-01/);
  });

  it("REQ-11: persisted JSON includes priority and reload restores each task priority", () => {
    const select = (): HTMLSelectElement => {
      const el = document.querySelector<HTMLSelectElement>(
        'form[aria-label="Add task"] [aria-label="Priority"]',
      );
      if (!el) {
        throw new Error("Add-task priority control not found");
      }
      return el;
    };

    const setPriority = (label: "Low" | "Normal" | "High"): void => {
      const prioritySelect = select();
      const option = [...prioritySelect.options].find(
        (o) => o.textContent?.trim() === label,
      );
      if (!option) {
        throw new Error(`Priority option "${label}" not found`);
      }
      prioritySelect.value = option.value;
      prioritySelect.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const addWithPriority = (
      title: string,
      label: "Low" | "Normal" | "High",
    ): void => {
      setPriority(label);
      submitTask(title);
    };

    mountFreshApp();
    addWithPriority("High task", "High");
    addWithPriority("Normal task", "Normal");
    addWithPriority("Low task", "Low");

    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    expect(raw).toContain('"priority":"high"');
    expect(raw).toContain('"priority":"normal"');
    expect(raw).toContain('"priority":"low"');

    mountFreshApp();

    expect(listItemWithTitle("High task").textContent).toMatch(/High/);
    expect(listItemWithTitle("Normal task").textContent).toMatch(/Normal/);
    expect(listItemWithTitle("Low task").textContent).toMatch(/Low/);

    const restored = loadTasks() as TaskWithPriority[];
    expect(restored.find((t) => t.title === "High task")?.priority).toBe("high");
    expect(restored.find((t) => t.title === "Normal task")?.priority).toBe(
      "normal",
    );
    expect(restored.find((t) => t.title === "Low task")?.priority).toBe("low");
  });

  it("REQ-9: after successful import, reload restores imported titles, completion, priorities, and due dates", async () => {
    ensureDataTransfer();
    mountFreshApp();
    submitTask("Pre-import noise");

    const importPayload = JSON.stringify([
      {
        id: "imp-a",
        title: "Imported active",
        completed: false,
        priority: "low",
        dueDate: "2031-04-10",
      },
      {
        id: "imp-b",
        title: "Imported done",
        completed: true,
        priority: "high",
      },
    ]);

    const fileInput = document.querySelector<HTMLInputElement>(
      'input[type="file"]',
    );
    if (!fileInput) {
      throw new Error("Import file input not found");
    }
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const file = new File([importPayload], "tasks.json", {
      type: "application/json",
    });
    assignFileToInput(fileInput, file);
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(document.body.textContent).not.toContain("Pre-import noise");
    expect(listItemWithTitle("Imported active").textContent).toMatch(/Low/);
    expect(
      listItemWithTitle("Imported active").querySelector(
        '[aria-label^="Due date"]',
      )?.textContent,
    ).toMatch(/2031-04-10/);
    expect(
      listItemWithTitle("Imported done").querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )?.checked,
    ).toBe(true);
    expect(listItemWithTitle("Imported done").textContent).toMatch(/High/);

    mountFreshApp();

    expect(listItemWithTitle("Imported active").textContent).toMatch(/Low/);
    expect(
      listItemWithTitle("Imported active").querySelector(
        '[aria-label^="Due date"]',
      )?.textContent,
    ).toMatch(/2031-04-10/);
    expect(
      listItemWithTitle("Imported done").querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )?.checked,
    ).toBe(true);
    expect(listItemWithTitle("Imported done").textContent).toMatch(/High/);

    const restored = loadTasks() as TaskWithPriority[];
    expect(restored.find((t) => t.title === "Imported active")).toMatchObject({
      completed: false,
      priority: "low",
      dueDate: "2031-04-10",
    });
    expect(restored.find((t) => t.title === "Imported done")).toMatchObject({
      completed: true,
      priority: "high",
    });
    expect(restored.find((t) => t.title === "Imported done")?.dueDate).toBe(
      undefined,
    );
  });

  it("REQ-1: loadTasks returns valid entries only and normalizes missing priority", () => {
    seedMixedValidInvalidStorage();

    const loaded = loadTasks() as TaskWithPriority[];

    expect(loaded).toEqual([
      {
        id: "keep-1",
        title: "Keep me",
        completed: false,
        priority: "normal",
      },
    ]);
  });

  it("REQ-2: partial invalid storage shows valid titles and hides invalid ones in the UI", () => {
    seedMixedValidInvalidStorage();

    mountFreshApp();

    expect(listItemWithTitle("Keep me")).toBeTruthy();
    expect(
      [...document.querySelectorAll("ul li")].some((li) =>
        li.textContent?.includes("missing id"),
      ),
    ).toBe(false);
  });

  it("REQ-3: partial invalid storage shows skip notice with invalid entry count", () => {
    seedMixedValidInvalidStorage();

    mountFreshApp();

    const noticeEl = skipNoticeElement();
    expect(noticeEl).not.toBeNull();
    expect(noticeEl!.getAttribute("role")).toBe("status");
    expect(noticeEl!.hasAttribute("hidden")).toBe(false);
    expect(skipNoticeText()).toBe(
      "1 invalid stored task skipped during load.",
    );

    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([
        { title: "bad one" },
        { id: "x", title: 42, completed: false },
      ]),
    );
    mountFreshApp();

    const allInvalidNoticeEl = skipNoticeElement();
    expect(allInvalidNoticeEl).not.toBeNull();
    expect(allInvalidNoticeEl!.hasAttribute("hidden")).toBe(false);
    expect(skipNoticeText()).toBe(
      "2 invalid stored tasks skipped during load.",
    );
    expect(document.querySelectorAll("ul li")).toHaveLength(0);
  });

  it("REQ-4: unreadable storage yields empty list without skip notice", () => {
    mountFreshApp();
    expect(skipNoticeText()).toBeNull();
    expect(document.querySelectorAll("ul li")).toHaveLength(0);

    localStorage.setItem(TASKS_STORAGE_KEY, "{not-json");
    mountFreshApp();
    expect(loadTasks()).toEqual([]);
    expect(skipNoticeText()).toBeNull();
    expect(document.querySelectorAll("ul li")).toHaveLength(0);

    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ wrong: true }));
    mountFreshApp();
    expect(loadTasks()).toEqual([]);
    expect(skipNoticeText()).toBeNull();
    expect(document.querySelectorAll("ul li")).toHaveLength(0);
  });

  it("REQ-5: startup load persists valid subset and reload keeps tasks without invalid JSON", () => {
    seedMixedValidInvalidStorage();

    mountFreshApp();

    const storedAfterLoad = JSON.parse(
      localStorage.getItem(TASKS_STORAGE_KEY)!,
    ) as unknown[];
    expect(storedAfterLoad).toHaveLength(1);
    expect(storedAfterLoad[0]).toMatchObject({
      id: "keep-1",
      title: "Keep me",
      completed: false,
    });
    expect(
      storedAfterLoad.some(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          "title" in entry &&
          (entry as { title?: string }).title === "missing id",
      ),
    ).toBe(false);

    mountFreshApp();

    expect(listItemWithTitle("Keep me")).toBeTruthy();
    const storedAfterReload = JSON.parse(
      localStorage.getItem(TASKS_STORAGE_KEY)!,
    ) as unknown[];
    expect(storedAfterReload).toHaveLength(1);
    expect(storedAfterReload[0]).toMatchObject({ title: "Keep me" });
  });

  it("REQ-12: legacy tasks without priority field load as normal in store and UI", () => {
    const legacy = [
      { id: "legacy-1", title: "Old task", completed: false },
      { id: "legacy-2", title: "Another old", completed: true },
    ];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadTasks() as TaskWithPriority[];
    expect(loaded).toHaveLength(2);
    expect(loaded.every((t) => t.priority === "normal")).toBe(true);

    mountFreshApp();

    expect(listItemWithTitle("Old task").textContent).toMatch(/Normal/);
    expect(listItemWithTitle("Another old").textContent).toMatch(/Normal/);
  });
});
