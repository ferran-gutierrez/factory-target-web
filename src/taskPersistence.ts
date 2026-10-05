import type { Task, TaskPriority } from "./taskStore";

export const TASKS_STORAGE_KEY = "factory-target-web.tasks";

const PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && PRIORITIES.includes(value as TaskPriority);
}

function isStoredTask(value: unknown): value is Task {
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
  if (t.priority !== undefined && !isTaskPriority(t.priority)) {
    return false;
  }
  return true;
}

function normalizeTask(raw: Task): Task {
  return {
    ...raw,
    priority: raw.priority ?? "normal",
  };
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
    if (!parsed.every(isStoredTask)) {
      return [];
    }
    return parsed.map(normalizeTask);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}
