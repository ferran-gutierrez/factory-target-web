import { filterTasks, type TaskFilter } from "./taskFilters";
import type { Task } from "./taskStore";

export const NO_SEARCH_MATCH_MESSAGE = "No tasks match";

export function isSearchQueryEffective(query: string): boolean {
  return query.trim().length > 0;
}

export function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return tasks;
  }
  const needle = trimmed.toLowerCase();
  return tasks.filter((task) => task.title.toLowerCase().includes(needle));
}

export function filterTasksByStatusAndSearch(
  tasks: Task[],
  filter: TaskFilter,
  query: string,
): Task[] {
  const byStatus = filterTasks(tasks, filter);
  return filterTasksBySearch(byStatus, query);
}

export function shouldShowAddTaskEmptyState(
  totalTaskCount: number,
  visibleCount: number,
  searchQuery: string,
): boolean {
  if (totalTaskCount === 0) {
    return true;
  }
  if (visibleCount > 0) {
    return false;
  }
  return !isSearchQueryEffective(searchQuery);
}

export function shouldShowNoMatchMessage(
  totalTaskCount: number,
  visibleCount: number,
  searchQuery: string,
): boolean {
  return (
    totalTaskCount > 0 &&
    visibleCount === 0 &&
    isSearchQueryEffective(searchQuery)
  );
}
