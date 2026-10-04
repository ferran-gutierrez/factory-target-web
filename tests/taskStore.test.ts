import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTaskStore,
  type Task,
  type TaskStore,
} from "../src/taskStore";
import { loadTasks, saveTasks, TASKS_STORAGE_KEY } from "../src/taskPersistence";

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

describe("task store", () => {
  let store: TaskStore;

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    store = createTaskStore();
  });

  it("REQ-1: adds a new incomplete task when title is non-empty after trim", () => {
    const added = store.addTask("  Buy milk  ");

    expect(added).toBe(true);
    expect(store.getTasks()).toHaveLength(1);
    expect(store.getTasks()[0]).toMatchObject({
      title: "Buy milk",
      completed: false,
    });
    expect(store.getTasks()[0]?.id).toEqual(expect.any(String));
    expect(store.getTasks()[0]?.id.length).toBeGreaterThan(0);
  });

  it("REQ-2: rejects empty or whitespace-only titles without changing task count", () => {
    expect(store.addTask("")).toBe(false);
    expect(store.addTask("   ")).toBe(false);
    expect(store.addTask("\n\t")).toBe(false);
    expect(store.getTasks()).toHaveLength(0);
  });

  it("REQ-3: updates an existing task title after save", () => {
    store.addTask("Original");
    const id = store.getTasks()[0]?.id;
    expect(id).toBeDefined();

    const updated = store.updateTaskTitle(id!, "Updated title");

    expect(updated).toBe(true);
    expect(store.getTasks()[0]?.title).toBe("Updated title");
  });

  it("REQ-4: marks an incomplete task as completed", () => {
    store.addTask("Walk dog");
    const id = store.getTasks()[0]?.id;
    expect(id).toBeDefined();

    store.setTaskCompleted(id!, true);

    expect(store.getTasks()[0]?.completed).toBe(true);
  });

  it("REQ-5: marks a completed task as active again", () => {
    store.addTask("Read book");
    const id = store.getTasks()[0]?.id;
    expect(id).toBeDefined();
    store.setTaskCompleted(id!, true);

    store.setTaskCompleted(id!, false);

    expect(store.getTasks()[0]?.completed).toBe(false);
  });

  it("REQ-6: removes task from list and persisted storage after confirmed delete", () => {
    store.addTask("Remove me");
    store.addTask("Keep me");
    saveTasks(store.getTasks());
    const toRemove = store.getTasks()[0]?.id;
    expect(toRemove).toBeDefined();

    const removed = store.deleteTask(toRemove!, true);

    expect(removed).toBe(true);
    expect(store.getTasks()).toHaveLength(1);
    expect(store.getTasks()[0]?.title).toBe("Keep me");

    const persisted = loadTasks();
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.title).toBe("Keep me");
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBeTruthy();
  });
});
