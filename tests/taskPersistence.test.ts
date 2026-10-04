// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import {
  loadTasks,
  saveTasks,
  TASKS_STORAGE_KEY,
} from "../src/taskPersistence";

type TaskWithDue = Task & { dueDate?: string };

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

describe("task persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  it("persists tasks in localStorage and restores titles and completion", () => {
    const tasks: Task[] = [
      { id: "id-1", title: "First", completed: false },
      { id: "id-2", title: "Second", completed: true },
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
      { id: "a", title: "With date", completed: false, dueDate: "2026-03-01" },
      { id: "b", title: "Without", completed: false },
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
});
