export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskStore = {
  addTask: (title: string) => Task | undefined;
  updateTaskTitle: (id: string, title: string) => boolean;
  setTaskCompleted: (id: string, completed: boolean) => boolean;
  deleteTask: (id: string) => boolean;
  getTasks: () => readonly Task[];
};

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createTaskStore(initial: Task[] = []): TaskStore {
  const tasks: Task[] = initial.map((t) => ({ ...t }));

  function getTasks(): readonly Task[] {
    return tasks;
  }

  function addTask(title: string): Task | undefined {
    const trimmed = title.trim();
    if (!trimmed) {
      return undefined;
    }
    const task: Task = { id: createId(), title: trimmed, completed: false };
    tasks.push(task);
    return task;
  }

  function updateTaskTitle(id: string, title: string): boolean {
    const trimmed = title.trim();
    if (!trimmed) {
      return false;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      return false;
    }
    task.title = trimmed;
    return true;
  }

  function setTaskCompleted(id: string, completed: boolean): boolean {
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      return false;
    }
    task.completed = completed;
    return true;
  }

  function deleteTask(id: string): boolean {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      return false;
    }
    tasks.splice(index, 1);
    return true;
  }

  return {
    addTask,
    updateTaskTitle,
    setTaskCompleted,
    deleteTask,
    getTasks,
  };
}
