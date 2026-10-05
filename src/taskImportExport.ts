import type { Task, TaskPriority } from "./taskStore";

const PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && PRIORITIES.includes(value as TaskPriority);
}

function isImportTaskObject(value: unknown): value is Task {
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

export type ParseImportResult =
  | { ok: true; tasks: Task[] }
  | { ok: false };

export function parseImportTasks(input: unknown): ParseImportResult {
  if (!Array.isArray(input)) {
    return { ok: false };
  }
  if (!input.every(isImportTaskObject)) {
    return { ok: false };
  }
  const tasks: Task[] = input.map((raw) => {
    const task: Task = {
      id: raw.id,
      title: raw.title,
      completed: raw.completed,
      priority: raw.priority ?? "normal",
    };
    if (raw.dueDate !== undefined) {
      task.dueDate = raw.dueDate;
    }
    return task;
  });
  return { ok: true, tasks };
}

export function serializeTasksForExport(tasks: Task[]): string {
  const payload = tasks.map((task) => {
    const obj: Record<string, unknown> = {
      id: task.id,
      title: task.title,
      completed: task.completed,
      priority: task.priority,
    };
    if (task.dueDate !== undefined) {
      obj.dueDate = task.dueDate;
    }
    return obj;
  });
  return JSON.stringify(payload);
}
