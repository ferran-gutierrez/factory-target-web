// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import { sortTasksByPriority } from "../src/taskPriority";

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

function submitTaskWithPriority(title: string, priority: PriorityLabel): void {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Task title"]',
  );
  if (!input) {
    throw new Error("Task entry control not found");
  }
  setAddFormPriority(priority);
  input.value = title;
  input.form?.requestSubmit();
}

function visibleListTitlesInOrder(): string[] {
  return [...document.querySelectorAll<HTMLLIElement>("ul li")].map((li) => {
    const span = li.querySelector("span");
    return span?.textContent ?? "";
  });
}

function selectPrioritySort(): void {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === "Priority",
  );
  if (!btn) {
    throw new Error('Sort control "Priority" not found');
  }
  btn.click();
}

type TaskWithPriority = Task & { priority?: "low" | "normal" | "high" };

describe("task priority sort — UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    mountFreshApp();
  });

  it("REQ-9: Priority sort lists high before normal before low preserving creation order within tier", () => {
    submitTaskWithPriority("Third", "Low");
    submitTaskWithPriority("First", "High");
    submitTaskWithPriority("Second", "Normal");

    expect(visibleListTitlesInOrder()).toEqual(["Third", "First", "Second"]);

    submitTaskWithPriority("Normal later", "Normal");
    submitTaskWithPriority("High later", "High");

    selectPrioritySort();

    expect(visibleListTitlesInOrder()).toEqual([
      "First",
      "High later",
      "Second",
      "Normal later",
      "Third",
    ]);
  });
});

describe("task priority sort — pure helper", () => {
  it("REQ-10: sortTasksByPriority orders high, then normal, then low with stable creation order", () => {
    const tasks: TaskWithPriority[] = [
      { id: "3", title: "Third", completed: false, priority: "low" },
      { id: "1", title: "First", completed: false, priority: "high" },
      { id: "5", title: "High later", completed: false, priority: "high" },
      { id: "2", title: "Second", completed: false, priority: "normal" },
      { id: "4", title: "Normal later", completed: false, priority: "normal" },
    ];

    const sorted = sortTasksByPriority(tasks);

    expect(sorted.map((t) => t.title)).toEqual([
      "First",
      "High later",
      "Second",
      "Normal later",
      "Third",
    ]);
  });
});
