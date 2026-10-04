import type { Task } from "./taskStore";

export const TASKS_STORAGE_KEY = "factory-target-web.tasks";

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const t = value as Record<string, unknown>;
  if (
    typeof t.id !== "string" ||
    typeof t.title !== "string" ||
    typeof t.completed !== "boolean"
  ) {
    return false;
  }
  if (t.dueDate !== undefined && typeof t.dueDate !== "string") {
    return false;
  }
  return true;
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    if (!parsed.every(isTask)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}
