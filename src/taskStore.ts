import { loadTasks, saveTasks } from "./taskPersistence";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskStore = {
  getTasks: () => Task[];
  addTask: (title: string) => boolean;
  updateTaskTitle: (id: string, title: string) => boolean;
  setTaskCompleted: (id: string, completed: boolean) => boolean;
  deleteTask: (id: string, confirmed: boolean) => boolean;
};

function newId(): string {
  return crypto.randomUUID();
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

    addTask(title: string) {
      const trimmed = title.trim();
      if (trimmed.length === 0) {
        return false;
      }
      tasks = [...tasks, { id: newId(), title: trimmed, completed: false }];
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
