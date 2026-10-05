// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import { filterTasks } from "../src/taskFilters";
import {
  filterTasksBySearch,
  filterTasksByStatusAndSearch,
  NO_SEARCH_MATCH_MESSAGE,
} from "../src/taskSearch";
import { saveTasks, TASKS_STORAGE_KEY } from "../src/taskPersistence";
import { sortTasksByPriority } from "../src/taskPriority";

const searchSampleTasks: Task[] = [
  { id: "1", title: "Buy eggs", completed: false, priority: "normal" },
  { id: "2", title: "Buy milk", completed: false, priority: "normal" },
];

const statusSearchTasks: Task[] = [
  { id: "a", title: "Alpha", completed: false, priority: "normal" },
  { id: "b", title: "Beta", completed: true, priority: "normal" },
  { id: "g", title: "Gamma", completed: false, priority: "normal" },
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
    throw new Error('Search control with aria-label "Search tasks" not found');
  }
  return input;
}

function setSearchQuery(query: string): void {
  const input = getSearchInput();
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
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

function visibleListTitlesInOrder(): string[] {
  return visibleListTitles();
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

function allLocalStorageValues(): string[] {
  const storage = localStorage;
  const values: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      values.push(storage.getItem(key) ?? "");
    }
  }
  return values;
}

describe("task search — pure helpers", () => {
  it("REQ-2: case-insensitive substring match on title", () => {
    const matched = filterTasksBySearch(searchSampleTasks, "EGG");
    expect(matched.map((t) => t.title)).toEqual(["Buy eggs"]);
    expect(matched.some((t) => t.title === "Buy milk")).toBe(false);
  });

  it("REQ-3: empty or whitespace-only query does not hide tasks by title", () => {
    for (const query of ["", "   ", "\t"]) {
      expect(filterTasksBySearch(searchSampleTasks, query)).toEqual(
        searchSampleTasks,
      );
    }
  });

  it("REQ-4: status filter and trimmed search combine (Active + query a)", () => {
    const visible = filterTasksByStatusAndSearch(statusSearchTasks, "active", "a");
    expect(visible.map((t) => t.title).sort()).toEqual(["Alpha", "Gamma"]);
    expect(visible.some((t) => t.title === "Beta")).toBe(false);
  });
});

describe("task search — UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  it("REQ-1: search input is above the task list with accessible name Search tasks", () => {
    saveTasks(searchSampleTasks);
    mountFreshApp();

    const search = getSearchInput();
    const list = document.querySelector("ul");
    expect(list).not.toBeNull();

    const sortBar = document.querySelector('[aria-label="Task sort"]');
    expect(sortBar).not.toBeNull();

    expect(
      sortBar!.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      search.compareDocumentPosition(list!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("REQ-5: stored tasks with zero search matches show No tasks match and hide list rows", () => {
    saveTasks(searchSampleTasks);
    mountFreshApp();

    setSearchQuery("zzznomatch");

    expect(document.querySelectorAll("ul li")).toHaveLength(0);
    const visibleMessage = [...document.querySelectorAll("p")].find(
      (p) => !p.hidden && p.textContent?.includes(NO_SEARCH_MATCH_MESSAGE),
    );
    expect(visibleMessage).toBeDefined();
    expect(document.body.textContent).not.toMatch(/add a task/i);
  });

  it("REQ-7: clearing search restores the list for the current status filter", () => {
    saveTasks(searchSampleTasks);
    mountFreshApp();
    clickFilter("Active");

    setSearchQuery("eggs");
    expect(visibleListTitles()).toEqual(["Buy eggs"]);

    setSearchQuery("");
    expect(visibleListTitles().sort()).toEqual(["Buy eggs", "Buy milk"].sort());
  });

  it("REQ-8: search is not persisted; reload shows empty search and all tasks under All", () => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage);
    saveTasks(searchSampleTasks);
    mountFreshApp();

    setSearchQuery("eggs");
    expect(getSearchInput().value).toBe("eggs");
    expect(visibleListTitles()).toEqual(["Buy eggs"]);

    for (const value of allLocalStorageValues()) {
      expect(value.toLowerCase()).not.toContain("eggs");
    }
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toContain("Buy eggs");

    document.body.innerHTML = `<main id="app"></main>`;
    mountTaskApp(document.querySelector("#app")!);

    expect(getSearchInput().value).toBe("");
    expect(
      document
        .querySelector('[aria-label="Task filters"] button[aria-pressed="true"]')
        ?.textContent,
    ).toBe("All");
    expect(visibleListTitles().sort()).toEqual(["Buy eggs", "Buy milk"].sort());
  });

  it("REQ-9: sort applies to the status- and search-filtered subset", () => {
    mountFreshApp();

    const addPriority = document.querySelector<HTMLSelectElement>(
      'form[aria-label="Add task"] [aria-label="Priority"]',
    )!;

    function addWithPriority(title: string, label: "Low" | "Normal" | "High"): void {
      const option = [...addPriority.options].find(
        (o) => o.textContent?.trim() === label,
      );
      addPriority.value = option!.value;
      submitTaskTitle(title);
    }

    addWithPriority("Cherry low", "Low");
    addWithPriority("Apple high", "High");
    addWithPriority("Apricot normal", "Normal");

    setSearchQuery("ap");
    expect(visibleListTitlesInOrder().sort()).toEqual(
      ["Apple high", "Apricot normal"].sort(),
    );

    selectPrioritySort();

    expect(visibleListTitlesInOrder()).toEqual(["Apple high", "Apricot normal"]);
    expect(document.querySelectorAll("ul li")).toHaveLength(2);
    expect(document.body.textContent).not.toContain("Cherry low");
  });
});

describe("task search — combined pipeline sanity", () => {
  it("REQ-9: priority sort runs on status- and search-filtered tasks in logic layer", () => {
    const tasks: Task[] = [
      { id: "1", title: "Apple", completed: false, priority: "normal" },
      { id: "2", title: "Apricot", completed: false, priority: "high" },
      { id: "3", title: "Banana", completed: false, priority: "low" },
    ];
    const filtered = filterTasksByStatusAndSearch(tasks, "all", "ap");
    const sorted = sortTasksByPriority(filtered);
    expect(sorted.map((t) => t.title)).toEqual(["Apricot", "Apple"]);
  });

  it("REQ-3: whitespace search does not narrow status-filtered tasks in logic layer", () => {
    const visible = filterTasks(
      filterTasksBySearch(statusSearchTasks, "  "),
      "active",
    );
    expect(visible.map((t) => t.title).sort()).toEqual(["Alpha", "Gamma"]);
  });
});
