// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import {
  EMPTY_STATE_MESSAGE,
  filterTasks,
  shouldShowEmptyState,
  type TaskFilter,
} from "../src/taskFilters";
import { saveTasks } from "../src/taskPersistence";

const sampleTasks: Task[] = [
  { id: "a", title: "Active one", completed: false, priority: "normal" },
  { id: "b", title: "Done one", completed: true, priority: "normal" },
  { id: "c", title: "Active two", completed: false, priority: "normal" },
];

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

function clickFilter(name: "All" | "Active" | "Done"): void {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === name,
  );
  btn?.click();
}

function visibleListTitles(): string[] {
  return [...document.querySelectorAll<HTMLLIElement>("ul li")].map((li) => {
    const span = li.querySelector("span");
    return span?.textContent ?? "";
  });
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

describe("task filters (logic)", () => {
  it("REQ-8: with filter all, every task is visible regardless of completion", () => {
    const visible = filterTasks(sampleTasks, "all");

    expect(visible).toHaveLength(3);
    expect(visible.map((t) => t.title).sort()).toEqual(
      ["Active one", "Active two", "Done one"].sort(),
    );
  });

  it("REQ-9: with filter active, only incomplete tasks are visible", () => {
    const visible = filterTasks(sampleTasks, "active");

    expect(visible).toHaveLength(2);
    expect(visible.every((t) => !t.completed)).toBe(true);
    expect(visible.map((t) => t.title).sort()).toEqual(
      ["Active one", "Active two"].sort(),
    );
  });

  it("REQ-10: with filter done, only completed tasks are visible", () => {
    const visible = filterTasks(sampleTasks, "done");

    expect(visible).toHaveLength(1);
    expect(visible[0]?.title).toBe("Done one");
    expect(visible[0]?.completed).toBe(true);
  });

  it("REQ-11: empty state applies when zero tasks match the current filter", () => {
    const filters: TaskFilter[] = ["all", "active", "done"];

    for (const filter of filters) {
      const visible = filterTasks([], filter);
      expect(visible).toHaveLength(0);
      expect(shouldShowEmptyState(visible.length)).toBe(true);
    }

    const activeOnly = filterTasks(
      [{ id: "d", title: "Done only", completed: true, priority: "normal" }],
      "active",
    );
    expect(activeOnly).toHaveLength(0);
    expect(shouldShowEmptyState(activeOnly.length)).toBe(true);
    expect(EMPTY_STATE_MESSAGE.toLowerCase()).toMatch(/add a task/);
  });
});

describe("task app filters UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    saveTasks(sampleTasks);
    mountFreshApp();
  });

  it("REQ-8: with filter all, every stored task is visible in the list", () => {
    clickFilter("All");
    expect(visibleListTitles().sort()).toEqual(
      ["Active one", "Active two", "Done one"].sort(),
    );
  });

  it("REQ-9: with filter active, completed tasks are hidden from the list", () => {
    clickFilter("Active");
    expect(visibleListTitles().sort()).toEqual(
      ["Active one", "Active two"].sort(),
    );
    expect(document.body.textContent).not.toContain("Done one");
  });

  it("REQ-10: with filter done, incomplete tasks are hidden from the list", () => {
    clickFilter("Done");
    expect(visibleListTitles()).toEqual(["Done one"]);
    expect(document.body.textContent).not.toContain("Active one");
    expect(document.body.textContent).not.toContain("Active two");
  });

  it("web-20261005-ic34 REQ-5: with zero stored tasks and empty search, shows add-task empty state not No tasks match", () => {
    vi.stubGlobal("localStorage", createStorage());
    document.body.innerHTML = `<main id="app"></main>`;
    mountTaskApp(document.querySelector("#app")!);

    const search = document.querySelector<HTMLInputElement>(
      'input[aria-label="Search tasks"]',
    );
    expect(search?.value ?? "").toBe("");

    const visible = document.querySelector("p:not([hidden])");
    expect(visible?.textContent).toBe(EMPTY_STATE_MESSAGE);
    expect(document.body.textContent).not.toContain("No tasks match");
  });

  it("REQ-11: displays empty state in the app when filter shows zero tasks", () => {
    vi.stubGlobal("localStorage", createStorage());
    document.body.innerHTML = `<main id="app"></main>`;
    mountTaskApp(document.querySelector("#app")!);

    const empty = document.querySelector("p:not([hidden])");
    expect(empty?.textContent).toBe(EMPTY_STATE_MESSAGE);

    submitTaskTitle("Only done");
    const item = document.querySelector("ul li")!;
    const checkbox = item.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));

    clickFilter("Active");
    const emptyActive = document.querySelector("p");
    expect(emptyActive?.hidden).toBe(false);
    expect(emptyActive?.textContent).toMatch(/add a task/i);
  });
});
