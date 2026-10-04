import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addTask,
  deleteTask,
  editTaskTitle,
  emptyStateMessage,
  filterTasks,
  shouldShowEmptyState,
  toggleTaskComplete,
  type Task,
  type TaskFilter,
} from "../src/taskLogic.js";
import {
  deserializeTasks,
  loadTasks,
  saveTasks,
  serializeTasks,
  TASKS_STORAGE_KEY,
} from "../src/storage.js";

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("taskLogic", () => {
  describe("addTask (REQ-2, REQ-3)", () => {
    it("adds a trimmed task that is not complete", () => {
      const next = addTask([], "  Buy milk  ");
      expect(next).toHaveLength(1);
      expect(next[0]?.title).toBe("Buy milk");
      expect(next[0]?.completed).toBe(false);
      expect(next[0]?.id).toBeTruthy();
    });

    it("does not add when title is empty or only whitespace", () => {
      expect(addTask([], "")).toEqual([]);
      expect(addTask([], "   \t  ")).toEqual([]);
      const existing: Task[] = [
        { id: "a", title: "Keep", completed: false },
      ];
      expect(addTask(existing, "  ")).toEqual(existing);
    });
  });

  describe("editTaskTitle (REQ-4)", () => {
    it("updates the title for the matching task", () => {
      const tasks: Task[] = [
        { id: "1", title: "Old", completed: false },
        { id: "2", title: "Other", completed: true },
      ];
      const next = editTaskTitle(tasks, "1", "  New title  ");
      expect(next).toHaveLength(2);
      expect(next.find((t) => t.id === "1")?.title).toBe("New title");
      expect(next.find((t) => t.id === "2")?.title).toBe("Other");
    });
  });

  describe("toggleTaskComplete (REQ-5)", () => {
    it("marks complete and incomplete again", () => {
      const tasks: Task[] = [{ id: "1", title: "Task", completed: false }];
      const done = toggleTaskComplete(tasks, "1");
      expect(done[0]?.completed).toBe(true);
      const undone = toggleTaskComplete(done, "1");
      expect(undone[0]?.completed).toBe(false);
    });
  });

  describe("filterTasks (REQ-6, REQ-7, REQ-8)", () => {
    const tasks: Task[] = [
      { id: "1", title: "Active one", completed: false },
      { id: "2", title: "Done one", completed: true },
      { id: "3", title: "Active two", completed: false },
    ];

    it("shows every task with the All filter", () => {
      expect(filterTasks(tasks, "all")).toHaveLength(3);
    });

    it("shows only incomplete tasks with the Active filter", () => {
      const active = filterTasks(tasks, "active");
      expect(active).toHaveLength(2);
      expect(active.every((t) => !t.completed)).toBe(true);
    });

    it("shows only complete tasks with the Done filter", () => {
      const done = filterTasks(tasks, "done");
      expect(done).toHaveLength(1);
      expect(done[0]?.title).toBe("Done one");
    });
  });

  describe("empty state (REQ-9)", () => {
    it("shows guidance when the active filter has no tasks", () => {
      const tasks: Task[] = [{ id: "1", title: "Only active", completed: false }];
      const filtered = filterTasks(tasks, "done");
      expect(filtered).toHaveLength(0);
      expect(shouldShowEmptyState(filtered)).toBe(true);
      const message = emptyStateMessage();
      expect(message.toLowerCase()).toMatch(/add/);
      expect(message.toLowerCase()).toMatch(/task/);
    });
  });

  describe("deleteTask (REQ-10)", () => {
    const tasks: Task[] = [
      { id: "keep", title: "Keep me", completed: false },
      { id: "remove", title: "Remove me", completed: false },
    ];

    it("leaves the list unchanged when confirmation is declined", () => {
      const confirm = vi.fn(() => false);
      const next = deleteTask(tasks, "remove", confirm);
      expect(confirm).toHaveBeenCalledOnce();
      expect(next).toEqual(tasks);
    });

    it("removes the task when confirmation is accepted", () => {
      const confirm = vi.fn(() => true);
      const next = deleteTask(tasks, "remove", confirm);
      expect(confirm).toHaveBeenCalledOnce();
      expect(next).toHaveLength(1);
      expect(next[0]?.id).toBe("keep");
    });
  });
});

describe("storage (REQ-11, REQ-12)", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
  });

  it("uses a stable application-specific localStorage key", () => {
    expect(TASKS_STORAGE_KEY).toBeTruthy();
    expect(TASKS_STORAGE_KEY).toMatch(/task/i);
  });

  it("persists and restores tasks with titles and completion flags", () => {
    const tasks: Task[] = [
      { id: "a", title: "First", completed: false },
      { id: "b", title: "Second", completed: true },
    ];
    saveTasks(storage, tasks);
    expect(storage.getItem(TASKS_STORAGE_KEY)).toBeTruthy();

    const raw = storage.getItem(TASKS_STORAGE_KEY)!;
    const roundTrip = deserializeTasks(raw);
    expect(roundTrip).toEqual(tasks);

    storage.clear();
    expect(loadTasks(storage)).toEqual([]);

    saveTasks(storage, tasks);
    expect(loadTasks(storage)).toEqual(tasks);
  });

  it("serializeTasks produces JSON loadTasks can read back", () => {
    const tasks: Task[] = [{ id: "x", title: "Persisted", completed: true }];
    const json = serializeTasks(tasks);
    expect(JSON.parse(json)).toEqual(tasks);
    saveTasks(storage, tasks);
    expect(loadTasks(storage)).toEqual(tasks);
  });
});

describe("default filter assumption", () => {
  it("documents All as the default filter type", () => {
    const defaultFilter: TaskFilter = "all";
    expect(filterTasks([], defaultFilter)).toEqual([]);
  });
});
