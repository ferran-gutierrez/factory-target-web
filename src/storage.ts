import type { Task } from "./taskLogic.js";

export const TASKS_STORAGE_KEY = "task-list-app-tasks";

export function serializeTasks(tasks: Task[]): string {
  return JSON.stringify(tasks);
}

export function deserializeTasks(raw: string): Task[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isTask);
  } catch {
    return [];
  }
}

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.completed === "boolean"
  );
}

export function saveTasks(storage: Storage, tasks: Task[]): void {
  storage.setItem(TASKS_STORAGE_KEY, serializeTasks(tasks));
}

export function loadTasks(storage: Storage): Task[] {
  const raw = storage.getItem(TASKS_STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  return deserializeTasks(raw);
}
