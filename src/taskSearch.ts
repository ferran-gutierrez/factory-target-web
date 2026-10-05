import {
  EMPTY_STATE_MESSAGE,
  filterTasks,
  type TaskFilter,
} from "./taskFilters";
import type { Task } from "./taskStore";

export { EMPTY_STATE_MESSAGE };

export const NO_MATCH_MESSAGE = "No tasks match";

export function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  if (query.trim().length === 0) {
    return tasks;
  }
  const needle = query.toLowerCase();
  return tasks.filter((t) => t.title.toLowerCase().includes(needle));
}

export function filterTasksByCompletionAndSearch(
  tasks: Task[],
  filter: TaskFilter,
  query: string,
): Task[] {
  const afterCompletion = filterTasks(tasks, filter);
  return filterTasksBySearch(afterCompletion, query);
}

export function shouldShowZeroStoredEmptyState(storedCount: number): boolean {
  return storedCount === 0;
}

export function shouldShowNoTasksMatch(
  storedCount: number,
  visibleCount: number,
): boolean {
  return storedCount > 0 && visibleCount === 0;
}
