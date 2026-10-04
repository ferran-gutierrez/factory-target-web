import {
  addTask,
  deleteTask,
  editTaskTitle,
  emptyStateMessage,
  filterTasks,
  shouldShowEmptyState,
  toggleTaskComplete,
  type Task,
  type TaskFilter,
} from "./taskLogic.js";
import { loadTasks, saveTasks } from "./storage.js";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Missing #app root element");
}
const app: HTMLElement = root;

let tasks: Task[] = loadTasks(window.localStorage);
let filter: TaskFilter = "all";
let editingId: string | null = null;

function persist(): void {
  saveTasks(window.localStorage, tasks);
}

function render(): void {
  app.replaceChildren();

  const heading = document.createElement("h1");
  heading.textContent = "Factory Target Web";

  const header = document.createElement("header");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.setAttribute("aria-label", "Task title");
  titleInput.placeholder = "What needs doing?";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "Add";
  addButton.addEventListener("click", () => {
    const next = addTask(tasks, titleInput.value);
    if (next.length !== tasks.length) {
      tasks = next;
      titleInput.value = "";
      persist();
      render();
    }
  });
  titleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addButton.click();
    }
  });

  header.append(titleInput, addButton);

  const filters = document.createElement("nav");
  filters.setAttribute("aria-label", "Task filters");
  for (const name of ["All", "Active", "Done"] as const) {
    const key = name.toLowerCase() as TaskFilter;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.setAttribute("aria-pressed", String(filter === key));
    button.addEventListener("click", () => {
      filter = key;
      editingId = null;
      render();
    });
    filters.append(button);
  }

  const visible = filterTasks(tasks, filter);
  const list = document.createElement("ul");
  list.setAttribute("aria-label", "Tasks");

  for (const task of visible) {
    const item = document.createElement("li");
    const isEditing = editingId === task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      tasks = toggleTaskComplete(tasks, task.id);
      persist();
      render();
    });

    if (isEditing) {
      const titleMirror = document.createElement("span");
      titleMirror.className = "sr-only";
      titleMirror.textContent = task.title;

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.setAttribute("aria-label", "Task title");
      editInput.value = task.title;

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "Save";
      saveButton.addEventListener("click", () => {
        tasks = editTaskTitle(tasks, task.id, editInput.value);
        editingId = null;
        persist();
        render();
      });

      item.append(checkbox, titleMirror, editInput, saveButton);
    } else {
      const titleSpan = document.createElement("span");
      titleSpan.textContent = task.title;

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        editingId = task.id;
        render();
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        tasks = deleteTask(tasks, task.id, () =>
          window.confirm("Delete this task?"),
        );
        persist();
        render();
      });

      item.append(checkbox, titleSpan, editButton, deleteButton);
    }

    list.append(item);
  }

  app.append(heading, header, filters, list);

  if (shouldShowEmptyState(visible)) {
    const status = document.createElement("div");
    status.setAttribute("role", "status");
    status.textContent = emptyStateMessage();
    app.append(status);
  }
}

render();
