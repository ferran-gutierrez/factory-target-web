import type { Task, TaskPriority } from "./taskStore";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export function sortTasksByPriority<T extends Task>(tasks: T[]): T[] {
  return [...tasks].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
}

export function formatPriorityLabel(priority: TaskPriority): string {
  if (priority === "low") {
    return "Low";
  }
  if (priority === "high") {
    return "High";
  }
  return "Normal";
}
