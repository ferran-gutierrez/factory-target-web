// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import {
  loadTasks,
  saveTasks,
  TASKS_STORAGE_KEY,
} from "../src/taskPersistence";

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

function submitTaskTitle(title: string): void {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Task title"]',
  );
  if (!input) {
    throw new Error("Task entry control not found");
  }
  input.value = title;
  input.form?.requestSubmit();
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

  it("REQ-12: persists tasks in localStorage and restores titles and completion after reload", () => {
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

  it("REQ-12: missing or corrupt storage starts from an empty list", () => {
    expect(loadTasks()).toEqual([]);

    localStorage.setItem(TASKS_STORAGE_KEY, "{not-json");
    expect(loadTasks()).toEqual([]);

    localStorage.setItem(TASKS_STORAGE_KEY, '{"wrong":true}');
    expect(loadTasks()).toEqual([]);
  });

  it("REQ-12: full page reload restores tasks in the app UI", () => {
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
});
