import { filterTasks, type TaskFilter } from "./taskFilters";
import type { Task } from "./taskStore";

export const NO_TASKS_MATCH_MESSAGE = "No tasks match";

export function normalizeSearchQuery(query: string): string {
  return query.trim();
}

export function taskTitleMatchesSearch(title: string, query: string): boolean {
  const trimmed = normalizeSearchQuery(query);
  if (trimmed === "") {
    return true;
  }
  return title.toLowerCase().includes(trimmed.toLowerCase());
}

export function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  const trimmed = normalizeSearchQuery(query);
  if (trimmed === "") {
    return tasks;
  }
  return tasks.filter((t) => taskTitleMatchesSearch(t.title, trimmed));
}

export function applyCompletionAndSearchFilters(
  tasks: Task[],
  filter: TaskFilter,
  searchQuery: string,
): Task[] {
  const afterCompletion = filterTasks(tasks, filter);
  return filterTasksBySearch(afterCompletion, searchQuery);
}

export function shouldShowNoTasksMatchMessage(
  storedTaskCount: number,
  searchQuery: string,
  visibleCount: number,
): boolean {
  const trimmed = normalizeSearchQuery(searchQuery);
  return storedTaskCount > 0 && trimmed !== "" && visibleCount === 0;
}

export function shouldShowEmptyStateMessage(
  storedTaskCount: number,
  searchQuery: string,
  visibleCount: number,
): boolean {
  if (shouldShowNoTasksMatchMessage(storedTaskCount, searchQuery, visibleCount)) {
    return false;
  }
  if (normalizeSearchQuery(searchQuery) !== "") {
    return false;
  }
  return visibleCount === 0;
}
