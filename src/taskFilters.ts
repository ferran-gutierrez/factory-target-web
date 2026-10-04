import type { Task } from "./taskStore";

export type TaskFilter = "all" | "active" | "done";

export function filterTasks(tasks: readonly Task[], filter: TaskFilter): Task[] {
  switch (filter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "done":
      return tasks.filter((t) => t.completed);
    default:
      return [...tasks];
  }
}
