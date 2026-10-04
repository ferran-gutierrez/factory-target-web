import { describe, expect, it } from "vitest";
import type { Task } from "../src/taskStore";
import { filterTasks, type TaskFilter } from "../src/taskFilters";

const sampleTasks: Task[] = [
  { id: "1", title: "Active one", completed: false },
  { id: "2", title: "Done one", completed: true },
  { id: "3", title: "Active two", completed: false },
  { id: "4", title: "Done two", completed: true },
];

function titles(tasks: readonly Task[]): string[] {
  return tasks.map((t) => t.title);
}

describe("taskFilters", () => {
  describe("REQ-12: filter All", () => {
    it("returns every stored task", () => {
      const filtered = filterTasks(sampleTasks, "all");

      expect(filtered).toHaveLength(4);
      expect(titles(filtered).sort()).toEqual(
        ["Active one", "Active two", "Done one", "Done two"].sort(),
      );
    });
  });

  describe("REQ-13: filter Active", () => {
    it("returns only incomplete tasks", () => {
      const filtered = filterTasks(sampleTasks, "active");

      expect(filtered).toHaveLength(2);
      expect(titles(filtered).sort()).toEqual(["Active one", "Active two"]);
      expect(filtered.every((t) => !t.completed)).toBe(true);
    });
  });

  describe("REQ-14: filter Done", () => {
    it("returns only completed tasks", () => {
      const filtered = filterTasks(sampleTasks, "done");

      expect(filtered).toHaveLength(2);
      expect(titles(filtered).sort()).toEqual(["Done one", "Done two"]);
      expect(filtered.every((t) => t.completed)).toBe(true);
    });
  });

  it("returns an empty array when the input list is empty for any filter", () => {
    const filters: TaskFilter[] = ["all", "active", "done"];
    for (const filter of filters) {
      expect(filterTasks([], filter)).toEqual([]);
    }
  });
});
