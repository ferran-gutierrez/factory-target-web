// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import { EMPTY_STATE_MESSAGE, type TaskFilter } from "../src/taskFilters";
import { saveTasks, TASKS_STORAGE_KEY } from "../src/taskPersistence";
import {
  NO_TASKS_MATCH_MESSAGE,
  applyCompletionAndSearchFilters,
  shouldShowEmptyStateMessage,
  shouldShowNoTasksMatchMessage,
  taskTitleMatchesSearch,
} from "../src/taskSearch";

const searchSampleTasks: Task[] = [
  { id: "1", title: "Buy milk", completed: false, priority: "normal" },
  { id: "2", title: "Walk dog", completed: false, priority: "normal" },
  { id: "3", title: "Alpha chore", completed: false, priority: "normal" },
  { id: "4", title: "Alpha done", completed: true, priority: "normal" },
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

function typeSearchQuery(query: string): void {
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

function markTaskComplete(title: string): void {
  const item = [...document.querySelectorAll<HTMLLIElement>("ul li")].find(
    (li) => li.querySelector("span")?.textContent === title,
  );
  const checkbox = item?.querySelector<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  if (!checkbox) {
    throw new Error(`Checkbox for "${title}" not found`);
  }
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("task title search (logic)", () => {
  it("REQ-2: matches titles with case-insensitive substring", () => {
    expect(taskTitleMatchesSearch("Buy milk", "MILK")).toBe(true);
    expect(taskTitleMatchesSearch("Buy milk", "buy")).toBe(true);
    expect(taskTitleMatchesSearch("Walk dog", "buy")).toBe(false);
  });

  it("REQ-3: combines completion filter with title search", () => {
    const activeAlpha = applyCompletionAndSearchFilters(
      searchSampleTasks,
      "active",
      "alpha",
    );
    expect(activeAlpha.map((t) => t.title)).toEqual(["Alpha chore"]);

    const doneAlpha = applyCompletionAndSearchFilters(
      searchSampleTasks,
      "done",
      "alpha",
    );
    expect(doneAlpha.map((t) => t.title)).toEqual(["Alpha done"]);
  });

  it("REQ-4: no-match message when stored tasks exist but none match search", () => {
    const visible = applyCompletionAndSearchFilters(
      searchSampleTasks,
      "all",
      "zzznomatch",
    );
    expect(visible).toHaveLength(0);
    expect(
      shouldShowNoTasksMatchMessage(searchSampleTasks.length, "zzznomatch", 0),
    ).toBe(true);
    expect(
      shouldShowEmptyStateMessage(searchSampleTasks.length, "zzznomatch", 0),
    ).toBe(false);
  });

  it("REQ-6: empty or whitespace-only query applies no title filter", () => {
    const withSpaces = applyCompletionAndSearchFilters(
      searchSampleTasks,
      "all",
      "   ",
    );
    expect(withSpaces.map((t) => t.title).sort()).toEqual(
      ["Alpha chore", "Alpha done", "Buy milk", "Walk dog"].sort(),
    );

    const cleared = applyCompletionAndSearchFilters(searchSampleTasks, "all", "");
    expect(cleared).toHaveLength(searchSampleTasks.length);
  });
});

describe("task search UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    saveTasks(searchSampleTasks);
    mountFreshApp();
  });

  it("REQ-1: exposes Search tasks above the list and typing filters without submit", () => {
    const search = getSearchInput();
    const list = document.querySelector("ul");
    expect(search).toBeTruthy();
    expect(list).toBeTruthy();
    expect(
      search.compareDocumentPosition(list!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    typeSearchQuery("milk");
    expect(visibleListTitles()).toEqual(["Buy milk"]);
    expect(document.querySelectorAll("ul li")).toHaveLength(1);
  });

  it("REQ-4: shows No tasks match and hides list rows when nothing matches", () => {
    typeSearchQuery("zzznomatch");
    expect(visibleListTitles()).toEqual([]);
    expect(document.querySelectorAll("ul li")).toHaveLength(0);
    const message = [...document.querySelectorAll("p")].find(
      (p) => !p.hidden && p.textContent === NO_TASKS_MATCH_MESSAGE,
    );
    expect(message).toBeTruthy();
  });

  it("REQ-6: clearing search restores titles for the current completion filter", () => {
    clickFilter("Active");
    typeSearchQuery("alpha");
    expect(visibleListTitles()).toEqual(["Alpha chore"]);

    typeSearchQuery("");
    expect(visibleListTitles().sort()).toEqual(
      ["Alpha chore", "Buy milk", "Walk dog"].sort(),
    );

    typeSearchQuery("   ");
    expect(visibleListTitles().sort()).toEqual(
      ["Alpha chore", "Buy milk", "Walk dog"].sort(),
    );
  });

  it("REQ-7: search input is empty after reload and search is not stored in localStorage", () => {
    typeSearchQuery("milk");
    expect(getSearchInput().value).toBe("milk");

    const keysBeforeReload = [...Array(localStorage.length)].map((_, i) =>
      localStorage.key(i),
    );
    expect(keysBeforeReload).toContain(TASKS_STORAGE_KEY);
    expect(keysBeforeReload.some((k) => k?.toLowerCase().includes("search"))).toBe(
      false,
    );

    mountFreshApp();
    expect(getSearchInput().value).toBe("");
    expect(visibleListTitles().sort()).toEqual(
      ["Alpha chore", "Alpha done", "Buy milk", "Walk dog"].sort(),
    );
  });
});

describe("task search with filters UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    saveTasks(searchSampleTasks);
    mountFreshApp();
  });

  it("REQ-3: active filter hides completed matches; done filter shows only completed matches", () => {
    clickFilter("Active");
    typeSearchQuery("alpha");
    expect(visibleListTitles()).toEqual(["Alpha chore"]);
    expect(document.body.textContent).not.toContain("Alpha done");

    clickFilter("Done");
    typeSearchQuery("alpha");
    expect(visibleListTitles()).toEqual(["Alpha done"]);
    expect(document.body.textContent).not.toContain("Alpha chore");
  });
});
