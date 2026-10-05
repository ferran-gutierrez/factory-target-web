// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import { filterTasks, type TaskFilter } from "../src/taskFilters";
import { saveTasks } from "../src/taskPersistence";
import {
  EMPTY_STATE_MESSAGE,
  NO_MATCH_MESSAGE,
  filterTasksByCompletionAndSearch,
  filterTasksBySearch,
  shouldShowNoTasksMatch,
  shouldShowZeroStoredEmptyState,
} from "../src/taskSearch";

const sampleTasks: Task[] = [
  { id: "a", title: "Active one", completed: false, priority: "normal" },
  { id: "b", title: "Done one", completed: true, priority: "normal" },
  { id: "c", title: "Active two", completed: false, priority: "normal" },
];

const searchSampleTasks: Task[] = [
  { id: "1", title: "Buy milk", completed: false, priority: "normal" },
  { id: "2", title: "Rebuy stamps", completed: false, priority: "normal" },
  { id: "3", title: "Milk only", completed: false, priority: "normal" },
];

const completionSearchTasks: Task[] = [
  { id: "h", title: "Homework", completed: false, priority: "normal" },
  { id: "w", title: "Workout", completed: true, priority: "normal" },
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

function getSearchInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Search tasks"]',
  );
  if (!input) {
    throw new Error("Search control not found");
  }
  return input;
}

function setSearchQuery(query: string): void {
  const input = getSearchInput();
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function visibleMessageText(): string | undefined {
  const message = document.querySelector("p:not([hidden])");
  return message?.textContent ?? undefined;
}

describe("task search (logic)", () => {
  it("REQ-2: title search is case-insensitive substring match on titles", () => {
    const visible = filterTasksBySearch(searchSampleTasks, "buy");

    expect(visible.map((t) => t.title).sort()).toEqual(
      ["Buy milk", "Rebuy stamps"].sort(),
    );
    expect(visible.some((t) => t.title === "Milk only")).toBe(false);

    const upper = filterTasksBySearch(searchSampleTasks, "MILK");
    expect(upper.map((t) => t.title).sort()).toEqual(
      ["Buy milk", "Milk only"].sort(),
    );
  });

  it("REQ-3: search combines with completion filter for active and done", () => {
    const activeWork = filterTasksByCompletionAndSearch(
      completionSearchTasks,
      "active",
      "work",
    );
    expect(activeWork.map((t) => t.title)).toEqual(["Homework"]);

    const doneWork = filterTasksByCompletionAndSearch(
      completionSearchTasks,
      "done",
      "work",
    );
    expect(doneWork.map((t) => t.title)).toEqual(["Workout"]);
  });

  it("REQ-4: pure search helper filters titles without DOM", () => {
    expect(filterTasksBySearch([], "anything")).toEqual([]);
    expect(filterTasksBySearch(searchSampleTasks, "reb")).toHaveLength(1);
    expect(filterTasksBySearch(searchSampleTasks, "reb")[0]?.title).toBe(
      "Rebuy stamps",
    );
  });

  it("REQ-5: pipeline applies completion filter first then search", () => {
    const combined = filterTasksByCompletionAndSearch(
      completionSearchTasks,
      "active",
      "work",
    );
    const completionOnly = filterTasks(completionSearchTasks, "active");
    const searchAfterCompletion = filterTasksBySearch(completionOnly, "work");

    expect(combined).toEqual(searchAfterCompletion);
    expect(combined.map((t) => t.title)).toEqual(["Homework"]);
    expect(combined.every((t) => !t.completed)).toBe(true);
  });

  it("REQ-6: no-match state when stored tasks exist but none are visible", () => {
    expect(shouldShowZeroStoredEmptyState(0)).toBe(true);
    expect(shouldShowNoTasksMatch(0, 0)).toBe(false);

    expect(shouldShowZeroStoredEmptyState(3)).toBe(false);
    expect(shouldShowNoTasksMatch(3, 0)).toBe(true);
    expect(shouldShowNoTasksMatch(3, 2)).toBe(false);
    expect(NO_MATCH_MESSAGE).toBe("No tasks match");
  });

  it("REQ-7: whitespace-only search is treated as no search after completion filter", () => {
    const filters: TaskFilter[] = ["all", "active", "done"];

    for (const filter of filters) {
      const withWhitespace = filterTasksByCompletionAndSearch(
        sampleTasks,
        filter,
        "   \t  ",
      );
      const withEmpty = filterTasksByCompletionAndSearch(
        sampleTasks,
        filter,
        "",
      );
      const completionOnly = filterTasks(sampleTasks, filter);

      expect(withWhitespace.map((t) => t.id).sort()).toEqual(
        completionOnly.map((t) => t.id).sort(),
      );
      expect(withEmpty.map((t) => t.id).sort()).toEqual(
        completionOnly.map((t) => t.id).sort(),
      );
    }
  });
});

describe("task app search UI", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    saveTasks(sampleTasks);
    mountFreshApp();
  });

  it("REQ-1: search control above list filters visible rows without removing stored tasks", () => {
    const searchInput = getSearchInput();
    const list = document.querySelector("ul");
    expect(list).toBeTruthy();
    expect(
      searchInput.compareDocumentPosition(list!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    setSearchQuery("Active one");
    expect(visibleListTitles()).toEqual(["Active one"]);
    expect(visibleListTitles()).not.toContain("Done one");

    const stored = JSON.parse(
      localStorage.getItem("factory-target-web.tasks") ?? "[]",
    ) as Task[];
    expect(stored).toHaveLength(3);
    expect(stored.map((t) => t.title).sort()).toEqual(
      ["Active one", "Active two", "Done one"].sort(),
    );
  });

  it("REQ-6: shows No tasks match and hides list rows when filter and search match nothing", () => {
    clickFilter("Done");
    setSearchQuery("Active");

    expect(visibleListTitles()).toHaveLength(0);
    expect(visibleMessageText()).toBe(NO_MATCH_MESSAGE);
    expect(document.body.textContent).not.toContain(EMPTY_STATE_MESSAGE);
  });

  it("REQ-7: clearing search restores tasks for the current completion filter", () => {
    clickFilter("Active");
    setSearchQuery("one");
    expect(visibleListTitles().sort()).toEqual(["Active one"].sort());

    setSearchQuery("");
    expect(visibleListTitles().sort()).toEqual(
      ["Active one", "Active two"].sort(),
    );

    setSearchQuery("   ");
    expect(visibleListTitles().sort()).toEqual(
      ["Active one", "Active two"].sort(),
    );
  });

  it("REQ-8: search is not persisted; remount shows empty search and all tasks under all", () => {
    clickFilter("Active");
    setSearchQuery("Active one");
    expect(getSearchInput().value).toBe("Active one");
    expect(visibleListTitles()).toEqual(["Active one"]);

    mountFreshApp();

    expect(getSearchInput().value).toBe("");
    expect(
      document
        .querySelector('button[aria-pressed="true"]')
        ?.textContent?.trim(),
    ).toBe("All");
    expect(visibleListTitles().sort()).toEqual(
      ["Active one", "Active two", "Done one"].sort(),
    );

    const keys = [...Array(localStorage.length)].map((_, i) =>
      localStorage.key(i),
    );
    expect(keys.every((k) => !String(k).toLowerCase().includes("search"))).toBe(
      true,
    );
  });
});
