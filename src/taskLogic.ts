export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskFilter = "all" | "active" | "done";

function newTaskId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function addTask(tasks: Task[], rawTitle: string): Task[] {
  const title = rawTitle.trim();
  if (!title) {
    return tasks;
  }
  return [...tasks, { id: newTaskId(), title, completed: false }];
}

export function editTaskTitle(tasks: Task[], id: string, rawTitle: string): Task[] {
  const title = rawTitle.trim();
  if (!title) {
    return tasks;
  }
  return tasks.map((task) => (task.id === id ? { ...task, title } : task));
}

export function toggleTaskComplete(tasks: Task[], id: string): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  switch (filter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "done":
      return tasks.filter((t) => t.completed);
    default:
      return tasks;
  }
}

export function shouldShowEmptyState(filteredTasks: Task[]): boolean {
  return filteredTasks.length === 0;
}

export function emptyStateMessage(): string {
  return "No tasks to show. Add a task using the title field and Add button.";
}

export function deleteTask(
  tasks: Task[],
  id: string,
  confirm: () => boolean,
): Task[] {
  if (!confirm()) {
    return tasks;
  }
  return tasks.filter((task) => task.id !== id);
}
