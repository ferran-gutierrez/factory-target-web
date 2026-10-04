import type { Task } from "./taskStore";

export function isTaskOverdue(task: Task, referenceDay: string): boolean {
  if (task.completed) {
    return false;
  }
  if (!task.dueDate) {
    return false;
  }
  return task.dueDate < referenceDay;
}

export function sortTasksByDueDate<T extends Task>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate;
    const bDue = b.dueDate;
    if (aDue && bDue) {
      const cmp = aDue.localeCompare(bDue);
      if (cmp !== 0) {
        return cmp;
      }
      return 0;
    }
    if (aDue && !bDue) {
      return -1;
    }
    if (!aDue && bDue) {
      return 1;
    }
    return 0;
  });
}

export function localCalendarDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
