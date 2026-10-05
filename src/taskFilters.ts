import type { Task } from "./taskStore";

export type TaskFilter = "all" | "active" | "done";

export const EMPTY_STATE_MESSAGE = "No tasks yet — add a task to get started.";
export const NO_MATCH_MESSAGE = "No tasks match";

export function normalizeSearchQuery(raw: string): string {
  return raw.trim();
}

export function filterTasksBySearchQuery(tasks: Task[], query: string): Task[] {
  const normalized = normalizeSearchQuery(query);
  if (normalized === "") {
    return tasks;
  }
  const needle = normalized.toLowerCase();
  return tasks.filter((t) => t.title.toLowerCase().includes(needle));
}

export function applySearchQuery(tasks: Task[], rawQuery: string): Task[] {
  return filterTasksBySearchQuery(tasks, normalizeSearchQuery(rawQuery));
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

export function shouldShowEmptyState(
  allTasks: Task[],
  filter: TaskFilter,
  searchQuery: string,
): boolean {
  if (allTasks.length === 0) {
    return true;
  }
  if (normalizeSearchQuery(searchQuery) !== "") {
    return false;
  }
  return filterTasks(allTasks, filter).length === 0;
}
