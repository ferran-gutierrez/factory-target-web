import { describe, expect, it } from "vitest";
import { isTaskOverdue, sortTasksByDueDate } from "../src/taskDates";
import type { Task } from "../src/taskStore";

type TaskWithDue = Task & { dueDate?: string };

function task(
  id: string,
  title: string,
  completed: boolean,
  dueDate?: string,
): TaskWithDue {
  return dueDate === undefined
    ? { id, title, completed }
    : { id, title, completed, dueDate };
}

describe("task due dates (pure helpers)", () => {
  const referenceDay = "2026-06-15";

  it("REQ-12: marks incomplete tasks with due date before the reference day as overdue", () => {
    expect(
      isTaskOverdue(
        task("1", "Past", false, "2026-06-14"),
        referenceDay,
      ),
    ).toBe(true);
  });

  it("REQ-12: tasks without a due date are not overdue", () => {
    expect(isTaskOverdue(task("1", "No date", false), referenceDay)).toBe(
      false,
    );
  });

  it("REQ-12: due date on the reference day is not overdue", () => {
    expect(
      isTaskOverdue(
        task("1", "Today", false, referenceDay),
        referenceDay,
      ),
    ).toBe(false);
  });

  it("REQ-12: due date after the reference day is not overdue", () => {
    expect(
      isTaskOverdue(
        task("1", "Future", false, "2026-06-16"),
        referenceDay,
      ),
    ).toBe(false);
  });

  it("REQ-12: completed tasks are not overdue even when due date is before the reference day", () => {
    expect(
      isTaskOverdue(
        task("1", "Done past", true, "2020-01-01"),
        referenceDay,
      ),
    ).toBe(false);
  });

  it("REQ-7: incomplete task due on the reference day is not overdue", () => {
    expect(
      isTaskOverdue(
        task("1", "Due today", false, referenceDay),
        referenceDay,
      ),
    ).toBe(false);
  });

  it("REQ-7: incomplete task due after the reference day is not overdue", () => {
    expect(
      isTaskOverdue(
        task("1", "Due later", false, "2026-12-31"),
        referenceDay,
      ),
    ).toBe(false);
  });

  it("REQ-8: completed task with past due date is never overdue", () => {
    expect(
      isTaskOverdue(
        task("1", "Completed late", true, "2019-05-01"),
        referenceDay,
      ),
    ).toBe(false);
  });
});

describe("task due date sort (pure helpers)", () => {
  it("REQ-10: sorts tasks with due dates first ascending, then tasks without due dates", () => {
    const tasks: TaskWithDue[] = [
      task("c", "No due", false),
      task("b", "Mid", false, "2026-03-15"),
      task("a", "Early", false, "2026-01-01"),
      task("d", "Also none", false),
    ];

    const sorted: TaskWithDue[] = sortTasksByDueDate(tasks);

    expect(sorted.map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("REQ-10: tasks sharing the same due date keep relative creation order", () => {
    const tasks: TaskWithDue[] = [
      task("first", "A", false, "2026-05-01"),
      task("second", "B", false, "2026-05-01"),
      task("third", "C", false, "2026-05-01"),
    ];

    const sorted: TaskWithDue[] = sortTasksByDueDate(tasks);

    expect(sorted.map((t) => t.id)).toEqual(["first", "second", "third"]);
  });

  it("REQ-13: due-date sort matches REQ-10 ordering without using the DOM", () => {
    const tasks: TaskWithDue[] = [
      task("z", "Later due", false, "2026-08-01"),
      task("y", "No due yet", false),
      task("x", "Soon", false, "2026-02-02"),
      task("w", "Same as soon", false, "2026-02-02"),
    ];

    const sorted: TaskWithDue[] = sortTasksByDueDate(tasks);

    expect(sorted.map((t) => t.title)).toEqual([
      "Soon",
      "Same as soon",
      "Later due",
      "No due yet",
    ]);
  });
});
