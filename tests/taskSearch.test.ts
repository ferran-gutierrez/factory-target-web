// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import { filterTasks, type TaskFilter } from "../src/taskFilters";
import { EMPTY_STATE_MESSAGE } from "../src/taskFilters";
import {
  filterTasksByTitleSearch,
  filterTasksForDisplay,
  NO_TASKS_MATCH_MESSAGE,
  shouldShowNoTasksMatchMessage,
  taskTitleMatchesSearch,
} from "../src/taskSearch";
import { loadTasks, saveTasks } from "../src/taskPersistence";

const searchSampleTasks: Task[] = [
  { id: "1", title: "Buy milk", completed: false, priority: "normal" },
  { id: "2", title: "ReBUY soon", completed: false, priority: "normal" },
  { id: "3", title: "Walk dog", completed: false, priority: "normal" },
];

const filterSearchTasks: Task[] = [
  { id: "a", title: "Beta task", completed: false, priority: "normal" },
  { id: "b", title: "Beta done", completed: true, priority: "normal" },
  { id: "c", title: "Alpha", completed: false, priority: "normal" },
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

function assertSearchDirectlyAboveTaskList(): void {
  const search = document.querySelector('input[aria-label="Search tasks"]');
  const list = document.querySelector("ul");
  expect(search).not.toBeNull();
  expect(list).not.toBeNull();
  const parent = list!.parentElement;
  expect(parent).not.toBeNull();
  const children = [...parent!.children];
  const searchIndex = children.indexOf(search!);
  const listIndex = children.indexOf(list!);
  expect(searchIndex).toBeGreaterThanOrEqual(0);
  expect(listIndex).toBeGreaterThan(searchIndex);
  expect(listIndex - searchIndex).toBe(1);
}

describe("task search (pure helpers)", () => {
  it("REQ-2: keeps tasks whose titles contain the query as a case-insensitive substring", () => {
    expect(taskTitleMatchesSearch("Buy milk", "buy")).toBe(true);
    expect(taskTitleMatchesSearch("ReBUY soon", "buy")).toBe(true);
    expect(taskTitleMatchesSearch("Walk dog", "buy")).toBe(false);

    const visible = filterTasksByTitleSearch(searchSampleTasks, "buy");
    expect(visible.map((t) => t.title)).toEqual(["Buy milk", "ReBUY soon"]);
  });

  it("REQ-2: trims whitespace on the query before matching", () => {
    const visible = filterTasksByTitleSearch(searchSampleTasks, "  buy  ");
    expect(visible.map((t) => t.title)).toEqual(["Buy milk", "ReBUY soon"]);
  });
});

describe("task search with status filters (pure helpers)", () => {
  function visibleTitles(
    filter: TaskFilter,
    query: string,
  ): string[] {
    return filterTasksForDisplay(filterSearchTasks, filter, query).map(
      (t) => t.title,
    );
  }

  it("REQ-3: active filter with query beta shows only incomplete matching titles", () => {
    expect(visibleTitles("active", "beta")).toEqual(["Beta task"]);
  });

  it("REQ-3: done filter with query beta shows only completed matching titles", () => {
    expect(visibleTitles("done", "beta")).toEqual(["Beta done"]);
  });
});

describe("task search no-match message (logic)", () => {
  it("REQ-4: shows no-match when filter subset is non-empty but search excludes every member", () => {
    const statusFiltered = filterTasks(filterSearchTasks, "all");
    expect(statusFiltered).toHaveLength(3);

    const visible = filterTasksByTitleSearch(statusFiltered, "zzzz");
    expect(visible).toHaveLength(0);

    expect(
      shouldShowNoTasksMatchMessage(
        statusFiltered.length,
        "zzzz",
        visible.length,
      ),
    ).toBe(true);
    expect(NO_TASKS_MATCH_MESSAGE).toBe("No tasks match");
  });
});

describe("task app search UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    saveTasks(searchSampleTasks);
    mountFreshApp();
  });

  it("REQ-1: exposes Search tasks control directly above the list and filters rows without removing stored tasks", () => {
    assertSearchDirectlyAboveTaskList();

    setSearchQuery("walk");
    expect(visibleListTitles()).toEqual(["Walk dog"]);
    expect(document.body.textContent).not.toContain("Buy milk");

    const stored = loadTasks();
    expect(stored?.map((t) => t.title).sort()).toEqual(
      ["Buy milk", "ReBUY soon", "Walk dog"].sort(),
    );
  });

  it("REQ-4: shows No tasks match, hides list rows, and not the add-task empty state when search excludes the filter subset", () => {
    setSearchQuery("zzzz");

    expect(document.body.textContent).toContain(NO_TASKS_MATCH_MESSAGE);
    expect(document.querySelectorAll("ul li")).toHaveLength(0);

    const emptyParagraphs = [...document.querySelectorAll("p")].filter(
      (p) => p.textContent === EMPTY_STATE_MESSAGE,
    );
    expect(emptyParagraphs.every((p) => p.hidden)).toBe(true);
  });

  it("REQ-6: clearing search restores tasks matching the current filter without reload", () => {
    clickFilter("Active");
    setSearchQuery("walk");
    expect(visibleListTitles()).toEqual(["Walk dog"]);

    setSearchQuery("");
    expect(visibleListTitles().sort()).toEqual(
      ["Buy milk", "ReBUY soon", "Walk dog"].sort(),
    );

    setSearchQuery("   ");
    expect(visibleListTitles().sort()).toEqual(
      ["Buy milk", "ReBUY soon", "Walk dog"].sort(),
    );
  });

  it("REQ-7: after remounting the app, search is empty and all stored tasks on All are visible", () => {
    setSearchQuery("walk");
    expect(visibleListTitles()).toEqual(["Walk dog"]);

    mountFreshApp();

    expect(getSearchInput().value).toBe("");
    clickFilter("All");
    expect(visibleListTitles().sort()).toEqual(
      ["Buy milk", "ReBUY soon", "Walk dog"].sort(),
    );
  });
});
