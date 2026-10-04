import { describe, expect, it } from "vitest";
import { createTaskStore } from "../src/taskStore";

describe("taskStore", () => {
  describe("REQ-2: add non-empty trimmed title", () => {
    it("adds one incomplete task with the trimmed title", () => {
      const store = createTaskStore();

      const task = store.addTask("  Buy milk  ");

      expect(task).toBeDefined();
      expect(task!.title).toBe("Buy milk");
      expect(task!.completed).toBe(false);
      expect(store.getTasks()).toHaveLength(1);
      expect(store.getTasks()[0].id).toBeTruthy();
      expect(store.getTasks()[0].id).not.toBe("Buy milk");
    });
  });

  describe("REQ-3: reject empty or whitespace-only titles", () => {
    it("does not add a task for an empty title", () => {
      const store = createTaskStore();

      const result = store.addTask("");

      expect(result).toBeUndefined();
      expect(store.getTasks()).toHaveLength(0);
    });

    it("does not add a task for whitespace-only title", () => {
      const store = createTaskStore();

      const result = store.addTask("   \t\n  ");

      expect(result).toBeUndefined();
      expect(store.getTasks()).toHaveLength(0);
    });
  });

  describe("REQ-4: update task title", () => {
    it("commits a trimmed title for the targeted task by id", () => {
      const store = createTaskStore();
      const created = store.addTask("Original");
      expect(created).toBeDefined();

      const updated = store.updateTaskTitle(created!.id, "  Updated title  ");

      expect(updated).toBe(true);
      const tasks = store.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Updated title");
      expect(tasks[0].id).toBe(created!.id);
    });
  });

  describe("REQ-5: mark incomplete task complete", () => {
    it("sets completed to true for the targeted task", () => {
      const store = createTaskStore();
      const task = store.addTask("Walk dog");
      expect(task).toBeDefined();

      const toggled = store.setTaskCompleted(task!.id, true);

      expect(toggled).toBe(true);
      expect(store.getTasks()[0].completed).toBe(true);
    });
  });

  describe("REQ-6: mark completed task incomplete", () => {
    it("sets completed to false for the targeted task", () => {
      const store = createTaskStore();
      const task = store.addTask("Read book");
      store.setTaskCompleted(task!.id, true);

      const toggled = store.setTaskCompleted(task!.id, false);

      expect(toggled).toBe(true);
      expect(store.getTasks()[0].completed).toBe(false);
    });
  });

  describe("REQ-10: delete task", () => {
    it("removes the task identified by id", () => {
      const store = createTaskStore();
      const a = store.addTask("Keep");
      const b = store.addTask("Remove");
      expect(store.getTasks()).toHaveLength(2);

      const deleted = store.deleteTask(b!.id);

      expect(deleted).toBe(true);
      const remaining = store.getTasks();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(a!.id);
    });

    it("returns false when deleting an unknown id without changing tasks", () => {
      const store = createTaskStore();
      store.addTask("Only one");

      const deleted = store.deleteTask("missing-id");

      expect(deleted).toBe(false);
      expect(store.getTasks()).toHaveLength(1);
    });
  });
});
