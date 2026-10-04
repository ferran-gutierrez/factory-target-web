import { describe, expect, it, beforeEach } from "vitest";
import { createTaskStore, type Task } from "../src/taskStore";
import {
  TASKS_STORAGE_KEY,
  createPersistedTaskStore,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "../src/taskPersistence";

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
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

function parseStoredTasks(storage: Storage): Task[] {
  const raw = storage.getItem(TASKS_STORAGE_KEY);
  if (raw === null) return [];
  return JSON.parse(raw) as Task[];
}

describe("taskPersistence", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("uses the factory-target-web:tasks storage key", () => {
    expect(TASKS_STORAGE_KEY).toBe("factory-target-web:tasks");
  });

  describe("REQ-16: persist after mutations", () => {
    it("writes the full task list after add", () => {
      const store = createPersistedTaskStore(storage);
      store.addTask("First");

      const stored = parseStoredTasks(storage);
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe("First");
      expect(stored[0].completed).toBe(false);
    });

    it("writes the full task list after title update", () => {
      const store = createPersistedTaskStore(storage);
      const task = store.addTask("Before");
      store.updateTaskTitle(task!.id, "After");

      const stored = parseStoredTasks(storage);
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe("After");
    });

    it("writes the full task list after completion toggle", () => {
      const store = createPersistedTaskStore(storage);
      const task = store.addTask("Toggle me");
      store.setTaskCompleted(task!.id, true);

      const stored = parseStoredTasks(storage);
      expect(stored[0].completed).toBe(true);
    });

    it("writes the full task list after delete", () => {
      const store = createPersistedTaskStore(storage);
      const keep = store.addTask("Keep");
      const remove = store.addTask("Remove");
      store.deleteTask(remove!.id);

      const stored = parseStoredTasks(storage);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(keep!.id);
    });

    it("does not write when add is rejected for whitespace-only title", () => {
      const store = createPersistedTaskStore(storage);
      store.addTask("   ");

      expect(storage.getItem(TASKS_STORAGE_KEY)).toBeNull();
    });
  });

  describe("REQ-17: restore on load", () => {
    it("loads valid saved tasks from storage", () => {
      const saved: Task[] = [
        { id: "a", title: "Saved active", completed: false },
        { id: "b", title: "Saved done", completed: true },
      ];
      saveTasksToStorage(storage, saved);

      const loaded = loadTasksFromStorage(storage);

      expect(loaded).toEqual(saved);
    });

    it("creates a persisted store pre-populated from valid storage", () => {
      const saved: Task[] = [{ id: "x", title: "From disk", completed: false }];
      saveTasksToStorage(storage, saved);

      const store = createPersistedTaskStore(storage);

      expect(store.getTasks()).toEqual(saved);
    });

    it("treats missing storage as an empty task list", () => {
      expect(loadTasksFromStorage(storage)).toEqual([]);

      const store = createPersistedTaskStore(storage);
      expect(store.getTasks()).toEqual([]);
    });

    it("treats invalid JSON as an empty task list", () => {
      storage.setItem(TASKS_STORAGE_KEY, "{not valid json");

      expect(loadTasksFromStorage(storage)).toEqual([]);

      const store = createPersistedTaskStore(storage);
      expect(store.getTasks()).toEqual([]);
    });

    it("treats non-array JSON as an empty task list", () => {
      storage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ tasks: [] }));

      expect(loadTasksFromStorage(storage)).toEqual([]);
    });
  });

  describe("saveTasksToStorage / loadTasksFromStorage round trip", () => {
    it("preserves tasks through serialize and parse", () => {
      const store = createTaskStore();
      const one = store.addTask("One");
      store.setTaskCompleted(one!.id, true);
      const full = store.getTasks();

      saveTasksToStorage(storage, full);
      expect(loadTasksFromStorage(storage)).toEqual(full);
    });
  });
});
