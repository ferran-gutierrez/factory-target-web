import type { Task } from "./taskStore";

export type TaskFilter = "all" | "active" | "done";

export const EMPTY_STATE_MESSAGE = "No tasks yet — add a task to get started.";
export const NO_MATCH_MESSAGE = "No tasks match";

export function normalizeSearchQuery(query: string): string {
  return query.trim();
}

export function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  const trimmed = normalizeSearchQuery(query);
  if (trimmed.length === 0) {
    return tasks;
  }
  const needle = trimmed.toLowerCase();
  return tasks.filter((t) => t.title.toLowerCase().includes(needle));
}

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

export function shouldShowEmptyState(visibleCount: number): boolean {
  return visibleCount === 0;
}
