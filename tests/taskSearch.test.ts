// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import {
  EMPTY_STATE_MESSAGE,
  applySearchQuery,
  filterTasks,
  filterTasksBySearchQuery,
  normalizeSearchQuery,
  type TaskFilter,
} from "../src/taskFilters";
import { saveTasks } from "../src/taskPersistence";

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

function getSearchInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Search tasks"]',
  );
  if (!input) {
    throw new Error("Search tasks control not found");
  }
  return input;
}

function getTaskListUl(): HTMLUListElement {
  const ul = document.querySelector("ul");
  if (!ul) {
    throw new Error("Task list not found");
  }
  return ul;
}

function setSearchQuery(query: string): void {
  const input = getSearchInput();
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function visibleListTitlesInOrder(): string[] {
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

function visibleTasksForFilterAndSearch(
  tasks: Task[],
  filter: TaskFilter,
  rawQuery: string,
): Task[] {
  const afterFilter = filterTasks(tasks, filter);
  return applySearchQuery(afterFilter, rawQuery);
}

describe("task title search (logic)", () => {
  it("REQ-2: title search is case-insensitive substring match on titles", () => {
    const tasks: Task[] = [
      { id: "1", title: "Buy Apples", completed: false, priority: "normal" },
      { id: "2", title: "Banana run", completed: false, priority: "normal" },
      { id: "3", title: "Pineapple juice", completed: false, priority: "normal" },
    ];

    expect(normalizeSearchQuery("  apple  ")).toBe("apple");

    const byApple = filterTasksBySearchQuery(tasks, "apple");
    expect(byApple.map((t: Task) => t.title)).toEqual([
      "Buy Apples",
      "Pineapple juice",
    ]);

    expect(applySearchQuery(tasks, "APPLE").map((t: Task) => t.title)).toEqual([
      "Buy Apples",
      "Pineapple juice",
    ]);
    expect(filterTasksBySearchQuery(tasks, "apple")).toHaveLength(2);
    expect(filterTasksBySearchQuery(tasks, "banana")).toEqual([
      tasks[1],
    ]);
  });

  it("REQ-3: visible tasks are intersection of completion filter and search query", () => {
    const tasks: Task[] = [
      { id: "a", title: "Milk active", completed: false, priority: "normal" },
      { id: "b", title: "Milk done", completed: true, priority: "normal" },
      { id: "c", title: "Bread", completed: false, priority: "normal" },
    ];

    const visible = visibleTasksForFilterAndSearch(tasks, "active", "milk");
    expect(visible).toHaveLength(1);
    expect(visible[0]?.title).toBe("Milk active");
  });
});

describe("task title search UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  it("REQ-1: search control with accessible name Search tasks sits directly above the task list", () => {
    saveTasks([
      { id: "1", title: "Sample", completed: false, priority: "normal" },
    ]);
    mountFreshApp();

    const search = getSearchInput();
    const list = getTaskListUl();
    const parent = list.parentElement;
    expect(parent).toBeTruthy();

    const siblings = [...parent!.children];
    const listIndex = siblings.indexOf(list);
    const searchIndex = siblings.indexOf(search);
    expect(searchIndex).toBeGreaterThanOrEqual(0);
    expect(listIndex).toBe(searchIndex + 1);

    expect(
      search.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("REQ-4: shows No tasks match with no list rows when stored tasks exist but filter and search match nothing", () => {
    saveTasks([
      { id: "1", title: "Only bananas", completed: false, priority: "normal" },
    ]);
    mountFreshApp();

    setSearchQuery("zzzz-no-match");
    expect(document.body.textContent).toContain("No tasks match");
    expect(document.querySelectorAll("ul li")).toHaveLength(0);
    expect(document.body.textContent).not.toContain("Only bananas");
  });

  it("REQ-5: with no stored tasks shows empty-list message not No tasks match even when search has text", () => {
    mountFreshApp();

    setSearchQuery("anything");
    expect(document.body.textContent).toContain(EMPTY_STATE_MESSAGE);
    expect(document.body.textContent).not.toContain("No tasks match");
    expect(document.querySelectorAll("ul li")).toHaveLength(0);
  });

  it("REQ-6: clearing search restores titles shown by the active completion filter alone", () => {
    saveTasks([
      { id: "a", title: "Keep visible", completed: false, priority: "normal" },
      { id: "b", title: "Hide me", completed: true, priority: "normal" },
    ]);
    mountFreshApp();

    clickFilter("Active");
    setSearchQuery("hide");
    expect(visibleListTitlesInOrder()).toEqual([]);
    expect(document.body.textContent).toContain("No tasks match");

    setSearchQuery("");
    expect(visibleListTitlesInOrder()).toEqual(["Keep visible"]);
    expect(document.body.textContent).not.toContain("No tasks match");

    clickFilter("Done");
    expect(visibleListTitlesInOrder()).toEqual(["Hide me"]);
  });

  it("REQ-8: creation-order sort applies after completion filter and search", () => {
    mountFreshApp();
    clickFilter("All");

    submitTaskTitle("Alpha z");
    submitTaskTitle("Gamma");
    submitTaskTitle("Beta z");

    setSearchQuery("z");
    const titles = visibleListTitlesInOrder();
    expect(titles).toEqual(["Alpha z", "Beta z"]);
    expect(titles).not.toContain("Gamma");
  });
});
