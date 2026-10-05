import { filterTasks, type TaskFilter } from "./taskFilters";
import type { Task } from "./taskStore";

export const NO_TASKS_MATCH_MESSAGE = "No tasks match";

export function taskTitleMatchesSearch(title: string, query: string): boolean {
  const trimmed = query.trim();
  if (trimmed === "") {
    return true;
  }
  return title.toLowerCase().includes(trimmed.toLowerCase());
}

export function filterTasksByTitleSearch(tasks: Task[], query: string): Task[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return tasks;
  }
  return tasks.filter((task) => taskTitleMatchesSearch(task.title, query));
}

export function filterTasksForDisplay(
  tasks: Task[],
  filter: TaskFilter,
  query: string,
): Task[] {
  const statusFiltered = filterTasks(tasks, filter);
  return filterTasksByTitleSearch(statusFiltered, query);
}

export function shouldShowNoTasksMatchMessage(
  statusFilteredCount: number,
  searchQuery: string,
  visibleCount: number,
): boolean {
  return (
    statusFilteredCount > 0 &&
    searchQuery.trim() !== "" &&
    visibleCount === 0
  );
}
