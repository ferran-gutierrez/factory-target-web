import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../src/taskStore";
import {
  loadTasks,
  saveTasks,
  TASKS_STORAGE_KEY,
} from "../src/taskPersistence";

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

describe("task persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  it("REQ-12: persists tasks in localStorage and restores titles and completion after reload", () => {
    const tasks: Task[] = [
      { id: "id-1", title: "First", completed: false },
      { id: "id-2", title: "Second", completed: true },
    ];

    saveTasks(tasks);

    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(
      JSON.stringify(tasks),
    );

    const restored = loadTasks();

    expect(restored).toEqual(tasks);
  });

  it("REQ-12: missing or corrupt storage starts from an empty list", () => {
    expect(loadTasks()).toEqual([]);

    localStorage.setItem(TASKS_STORAGE_KEY, "{not-json");
    expect(loadTasks()).toEqual([]);

    localStorage.setItem(TASKS_STORAGE_KEY, '{"wrong":true}');
    expect(loadTasks()).toEqual([]);
  });
});
