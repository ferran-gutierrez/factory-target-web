import { loadTasks, saveTasks } from "./taskPersistence";

export type TaskPriority = "low" | "normal" | "high";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: TaskPriority;
};

export type TaskStore = {
  getTasks: () => Task[];
  addTask: (
    title: string,
    dueDate?: string,
    priority?: TaskPriority,
  ) => boolean;
  updateTaskTitle: (id: string, title: string) => boolean;
  updateTask: (
    id: string,
    title: string,
    dueDate?: string,
    priority?: TaskPriority,
  ) => boolean;
  setTaskCompleted: (id: string, completed: boolean) => boolean;
  deleteTask: (id: string, confirmed: boolean) => boolean;
};

function newId(): string {
  return crypto.randomUUID();
}

function taskWithoutDueDate(task: Task): Task {
  const next: Task = {
    id: task.id,
    title: task.title,
    completed: task.completed,
    priority: task.priority,
  };
  return next;
}

export function createTaskStore(): TaskStore {
  let tasks: Task[] = loadTasks();

  function persist(): void {
    saveTasks(tasks);
  }

  return {
    getTasks() {
      return tasks;
    },

    addTask(title: string, dueDate?: string, priority: TaskPriority = "normal") {
      const trimmed = title.trim();
      if (trimmed.length === 0) {
        return false;
      }
      const dueTrimmed = dueDate?.trim();
      const task: Task = {
        id: newId(),
        title: trimmed,
        completed: false,
        priority,
      };
      if (dueTrimmed && dueTrimmed.length > 0) {
        task.dueDate = dueTrimmed;
      }
      tasks = [...tasks, task];
      persist();
      return true;
    },

    updateTaskTitle(id: string, title: string) {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return false;
      }
      tasks = tasks.map((t, i) => (i === index ? { ...t, title } : t));
      persist();
      return true;
    },

    updateTask(
      id: string,
      title: string,
      dueDate?: string,
      priority?: TaskPriority,
    ) {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return false;
      }
      const dueTrimmed = dueDate?.trim();
      tasks = tasks.map((t, i) => {
        if (i !== index) {
          return t;
        }
        const next: Task = {
          ...t,
          title,
          priority: priority ?? t.priority,
        };
        if (dueTrimmed && dueTrimmed.length > 0) {
          next.dueDate = dueTrimmed;
        } else {
          return taskWithoutDueDate(next);
        }
        return next;
      });
      persist();
      return true;
    },

    setTaskCompleted(id: string, completed: boolean) {
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return false;
      }
      tasks = tasks.map((t, i) => (i === index ? { ...t, completed } : t));
      persist();
      return true;
    },

    deleteTask(id: string, confirmed: boolean) {
      if (!confirmed) {
        return false;
      }
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return false;
      }
      tasks = tasks.filter((t) => t.id !== id);
      persist();
      return true;
    },
  };
}
