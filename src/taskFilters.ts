import type { Task } from "./taskStore";

export type TaskFilter = "all" | "active" | "done";

export const EMPTY_STATE_MESSAGE = "No tasks yet — add a task to get started.";

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  switch (filter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "done":
      return tasks.filter((t) => t.completed);
    default:
      return tasks;
  }
}

export function shouldShowEmptyState(
  _storedCount: number,
  statusFilteredCount: number,
  _searchQuery: string,
): boolean {
  return statusFilteredCount === 0;
}
