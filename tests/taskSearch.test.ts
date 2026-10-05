// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import {
  EMPTY_STATE_MESSAGE,
  filterTasksBySearch,
  NO_MATCH_MESSAGE,
} from "../src/taskFilters";
import { sortTasksByDueDate } from "../src/taskDates";
import { sortTasksByPriority } from "../src/taskPriority";
import { saveTasks, TASKS_STORAGE_KEY } from "../src/taskPersistence";
import { filterTasks } from "../src/taskFilters";

const searchSampleTasks: Task[] = [
  { id: "1", title: "Plan Alpha", completed: false, priority: "normal" },
  { id: "2", title: "plan beta", completed: false, priority: "high" },
  { id: "3", title: "Ship Gamma", completed: true, priority: "low" },
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

function getSearchInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Search tasks"]',
  );
  if (!input) {
    throw new Error("Search tasks control not found");
  }
  return input;
}

function setSearchQuery(query: string): void {
  const input = getSearchInput();
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function visibleListTitles(): string[] {
  return [...document.querySelectorAll<HTMLLIElement>("ul li")].map((li) => {
    const span = li.querySelector("span");
    return span?.textContent ?? "";
  });
}

function clickFilter(name: "All" | "Active" | "Done"): void {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === name,
  );
  btn?.click();
}

function clickSort(name: "Creation order" | "Due date" | "Priority"): void {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === name,
  );
  btn?.click();
}

describe("task title search (logic)", () => {
  it("REQ-3: filterTasksBySearch matches titles case-insensitively and skips non-matches", () => {
    const matched = filterTasksBySearch(searchSampleTasks, "plan");
    expect(matched.map((t) => t.title)).toEqual(["Plan Alpha", "plan beta"]);

    const noMatch = filterTasksBySearch(searchSampleTasks, "delta");
    expect(noMatch).toHaveLength(0);

    const emptyQuery = filterTasksBySearch(searchSampleTasks, "   ");
    expect(emptyQuery).toHaveLength(3);
  });

  it("REQ-2: completion filter combines with search before display ordering", () => {
    const active = filterTasks(searchSampleTasks, "active");
    const visible = filterTasksBySearch(active, "PLAN");
    expect(visible.map((t) => t.title)).toEqual(["Plan Alpha", "plan beta"]);
    expect(visible.some((t) => t.title === "Ship Gamma")).toBe(false);
  });

  it("REQ-8: priority sort orders only search-matched tasks", () => {
    const active = filterTasks(searchSampleTasks, "active");
    const searched = filterTasksBySearch(active, "plan");
    const ordered = sortTasksByPriority(searched);
    expect(ordered.map((t) => t.title)).toEqual(["plan beta", "Plan Alpha"]);
  });

  it("REQ-8: creation order keeps store sequence on the search-matched subset", () => {
    const creationOrderTasks: Task[] = [
      { id: "z", title: "Zulu plan", completed: false, priority: "normal" },
      { id: "a", title: "Alpha plan", completed: false, priority: "high" },
      { id: "m", title: "Mike plan", completed: true, priority: "low" },
    ];
    const active = filterTasks(creationOrderTasks, "active");
    const searched = filterTasksBySearch(active, "plan");
    expect(searched.map((t) => t.title)).toEqual(["Zulu plan", "Alpha plan"]);
  });

  it("REQ-8: due date sort orders only search-matched tasks", () => {
    const dueTasks: Task[] = [
      {
        id: "1",
        title: "Plan Alpha",
        completed: false,
        priority: "normal",
        dueDate: "2099-06-01",
      },
      {
        id: "2",
        title: "plan beta",
        completed: false,
        priority: "high",
        dueDate: "2000-01-15",
      },
      { id: "3", title: "Ship Gamma", completed: true, priority: "low" },
    ];
    const active = filterTasks(dueTasks, "active");
    const searched = filterTasksBySearch(active, "plan");
    const ordered = sortTasksByDueDate(searched);
    expect(ordered.map((t) => t.title)).toEqual(["plan beta", "Plan Alpha"]);
  });
});

describe("task title search UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    saveTasks(searchSampleTasks);
    mountFreshApp();
  });

  it("REQ-1: search control sits immediately above the task list with accessible name Search tasks", () => {
    const search = getSearchInput();
    const list = document.querySelector("ul");
    expect(list).not.toBeNull();
    expect(search.nextElementSibling).toBe(list);

    const searchLabel = document.querySelector('label[for="task-search"]');
    const hasAccessibleName =
      search.getAttribute("aria-label") === "Search tasks" ||
      searchLabel?.textContent === "Search tasks";
    expect(hasAccessibleName).toBe(true);
  });

  it("REQ-2: active filter and PLAN query show only matching incomplete titles", () => {
    clickFilter("Active");
    setSearchQuery("PLAN");
    expect(visibleListTitles()).toEqual(["Plan Alpha", "plan beta"]);
    expect(document.body.textContent).not.toContain("Ship Gamma");
  });

  it("REQ-4: non-matching search shows No tasks match and hides list rows", () => {
    setSearchQuery("zzznomatch");
    expect(document.querySelector("ul li")).toBeNull();
    const message = [...document.querySelectorAll("p")].find(
      (p) => !p.hidden && p.textContent === NO_MATCH_MESSAGE,
    );
    expect(message).toBeDefined();
    expect(document.body.textContent).not.toContain(EMPTY_STATE_MESSAGE);
  });

  it("REQ-5: with zero stored tasks, search text still shows add-a-task empty state", () => {
    vi.stubGlobal("localStorage", createStorage());
    mountFreshApp();
    setSearchQuery("anything");
    const visibleEmpty = document.querySelector("p:not([hidden])");
    expect(visibleEmpty?.textContent).toBe(EMPTY_STATE_MESSAGE);
    expect(document.body.textContent).not.toContain(NO_MATCH_MESSAGE);
  });

  it("REQ-6: clearing search restores rows for the current completion filter and sort", () => {
    clickSort("Priority");
    clickFilter("Active");
    const priorityOrder = ["plan beta", "Plan Alpha"];
    expect(visibleListTitles()).toEqual(priorityOrder);

    setSearchQuery("PLAN");
    expect(visibleListTitles()).toEqual(priorityOrder);

    setSearchQuery("Plan Alpha");
    expect(visibleListTitles()).toEqual(["Plan Alpha"]);

    setSearchQuery("");
    expect(visibleListTitles()).toEqual(priorityOrder);

    setSearchQuery("   ");
    expect(visibleListTitles()).toEqual(priorityOrder);

    clickSort("Due date");
    vi.stubGlobal("localStorage", createStorage());
    saveTasks([
      {
        id: "1",
        title: "Plan Alpha",
        completed: false,
        priority: "normal",
        dueDate: "2099-06-01",
      },
      {
        id: "2",
        title: "plan beta",
        completed: false,
        priority: "high",
        dueDate: "2000-01-15",
      },
      { id: "3", title: "Ship Gamma", completed: true, priority: "low" },
    ]);
    mountFreshApp();
    clickSort("Due date");
    clickFilter("Active");
    const dueOrder = ["plan beta", "Plan Alpha"];
    expect(visibleListTitles()).toEqual(dueOrder);

    setSearchQuery("plan");
    expect(visibleListTitles()).toEqual(dueOrder);

    setSearchQuery("");
    expect(visibleListTitles()).toEqual(dueOrder);
  });

  it("REQ-7: search text is not persisted; remount shows empty search and all tasks on All", () => {
    setSearchQuery("PLAN");
    clickFilter("Active");
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem("factory-target-web.search")).toBeNull();

    mountFreshApp();
    expect(getSearchInput().value).toBe("");
    clickFilter("All");
    expect(visibleListTitles().sort()).toEqual(
      ["Plan Alpha", "Ship Gamma", "plan beta"].sort(),
    );
  });
});
