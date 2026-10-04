import { describe, expect, it } from "vitest";
import type { Task } from "../src/taskStore";
import {
  EMPTY_STATE_MESSAGE,
  filterTasks,
  shouldShowEmptyState,
  type TaskFilter,
} from "../src/taskFilters";

const sampleTasks: Task[] = [
  { id: "a", title: "Active one", completed: false },
  { id: "b", title: "Done one", completed: true },
  { id: "c", title: "Active two", completed: false },
];

describe("task filters", () => {
  it("REQ-8: with filter all, every task is visible regardless of completion", () => {
    const visible = filterTasks(sampleTasks, "all");

    expect(visible).toHaveLength(3);
    expect(visible.map((t) => t.title).sort()).toEqual(
      ["Active one", "Active two", "Done one"].sort(),
    );
  });

  it("REQ-9: with filter active, only incomplete tasks are visible", () => {
    const visible = filterTasks(sampleTasks, "active");

    expect(visible).toHaveLength(2);
    expect(visible.every((t) => !t.completed)).toBe(true);
    expect(visible.map((t) => t.title).sort()).toEqual(
      ["Active one", "Active two"].sort(),
    );
  });

  it("REQ-10: with filter done, only completed tasks are visible", () => {
    const visible = filterTasks(sampleTasks, "done");

    expect(visible).toHaveLength(1);
    expect(visible[0]?.title).toBe("Done one");
    expect(visible[0]?.completed).toBe(true);
  });

  it("REQ-11: empty state applies when zero tasks match the current filter", () => {
    const filters: TaskFilter[] = ["all", "active", "done"];

    for (const filter of filters) {
      const visible = filterTasks([], filter);
      expect(visible).toHaveLength(0);
      expect(shouldShowEmptyState(visible.length)).toBe(true);
    }

    const activeOnly = filterTasks(
      [{ id: "d", title: "Done only", completed: true }],
      "active",
    );
    expect(activeOnly).toHaveLength(0);
    expect(shouldShowEmptyState(activeOnly.length)).toBe(true);
    expect(EMPTY_STATE_MESSAGE.toLowerCase()).toMatch(/add a task/);
  });
});
