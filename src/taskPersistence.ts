import { createTaskStore, type Task, type TaskStore } from "./taskStore";

export const TASKS_STORAGE_KEY = "factory-target-web:tasks";

export function loadTasksFromStorage(storage: Storage): Task[] {
  const raw = storage.getItem(TASKS_STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as Task[];
  } catch {
    return [];
  }
}

export function saveTasksToStorage(storage: Storage, tasks: readonly Task[]): void {
  storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function createPersistedTaskStore(storage: Storage): TaskStore {
  const initial = loadTasksFromStorage(storage);
  const store = createTaskStore(initial);

  function persist(): void {
    saveTasksToStorage(storage, store.getTasks());
  }

  return {
    addTask(title: string) {
      const task = store.addTask(title);
      if (task) {
        persist();
      }
      return task;
    },
    updateTaskTitle(id: string, title: string) {
      const ok = store.updateTaskTitle(id, title);
      if (ok) {
        persist();
      }
      return ok;
    },
    setTaskCompleted(id: string, completed: boolean) {
      const ok = store.setTaskCompleted(id, completed);
      if (ok) {
        persist();
      }
      return ok;
    },
    deleteTask(id: string) {
      const ok = store.deleteTask(id);
      if (ok) {
        persist();
      }
      return ok;
    },
    getTasks() {
      return store.getTasks();
    },
  };
}
