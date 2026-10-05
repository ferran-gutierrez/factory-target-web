// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";

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

function getAddDueDateInputViaLabel(): HTMLInputElement {
  const form = document.querySelector('form[aria-label="Add task"]');
  if (!form) {
    throw new Error("Add task form not found");
  }
  const label = [...form.querySelectorAll("label")].find(
    (el) => el.textContent?.trim() === "Due date",
  );
  if (!label) {
    throw new Error('Add form label "Due date" not found');
  }
  expect(label.hidden).toBe(false);
  const id = label.htmlFor;
  expect(id.length).toBeGreaterThan(0);
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement) || input.type !== "date") {
    throw new Error("Due date label is not associated with a date input");
  }
  if (!form.contains(input)) {
    throw new Error("Due date input is outside the add task form");
  }
  return input;
}

function submitTask(title: string, dueDate?: string): void {
  const input = getTaskInput();
  input.value = title;
  if (dueDate !== undefined) {
    getAddDueDateInputViaLabel().value = dueDate;
  }
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

function getEditDueDateInputViaLabel(item: HTMLElement): HTMLInputElement {
  const label = [...item.querySelectorAll("label")].find(
    (el) => el.textContent?.trim() === "Edit due date",
  );
  if (!label) {
    throw new Error('Edit row label "Edit due date" not found');
  }
  expect(label.hidden).toBe(false);
  const id = label.htmlFor;
  expect(id.length).toBeGreaterThan(0);
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement) || input.type !== "date") {
    throw new Error("Edit due date label is not associated with a date input");
  }
  if (!item.contains(input)) {
    throw new Error("Edit due date input is outside the task row");
  }
  return input;
}

describe("task due date field labels", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    mountFreshApp();
  });

  it("REQ-1: add-task form due date input has visible label Due date linked to the date control", () => {
    const dueInput = getAddDueDateInputViaLabel();
    expect(dueInput).toBeInstanceOf(HTMLInputElement);

    submitTask("Scheduled", "2026-12-01");
    const item = listItemWithTitle("Scheduled");
    expect(item.querySelector('[aria-label^="Due date"]')?.textContent).toMatch(
      /2026-12-01/,
    );
  });

  it("REQ-2: edit mode due date input has visible label Edit due date linked to the date control", () => {
    submitTask("Adjust me", "2026-03-10");
    const item = listItemWithTitle("Adjust me");
    [...item.querySelectorAll("button")]
      .find((b) => b.textContent === "Edit")
      ?.click();

    const editItem = listItemWithTitle("Adjust me");
    const dueInput = getEditDueDateInputViaLabel(editItem);
    expect(dueInput.value).toBe("2026-03-10");

    dueInput.value = "2026-08-20";
    [...editItem.querySelectorAll("button")]
      .find((b) => b.textContent === "Save")
      ?.click();

    expect(
      listItemWithTitle("Adjust me").querySelector('[aria-label^="Due date"]')
        ?.textContent,
    ).toMatch(/2026-08-20/);
  });
});
