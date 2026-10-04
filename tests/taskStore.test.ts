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

function submitTaskTitle(title: string): void {
  const input = getTaskInput();
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

describe("task store", () => {
  let store: TaskStore;

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    store = createTaskStore();
  });

  it("REQ-2: rejects empty or whitespace-only titles without changing task count", () => {
    expect(store.addTask("")).toBe(false);
    expect(store.addTask("   ")).toBe(false);
    expect(store.addTask("\n\t")).toBe(false);
    expect(store.getTasks()).toHaveLength(0);
  });
});

describe("task app UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    mountFreshApp();
  });

  it("REQ-1: exposes task entry control and adds incomplete task to the list", () => {
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

  it("REQ-3: shows updated title in the list after edit and save", () => {
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

  it("REQ-4: presents completed task with checked control", () => {
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

  it("REQ-5: presents active task again when marked not complete", () => {
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

  it("REQ-6: confirms delete, then removes task from list and storage", () => {
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
