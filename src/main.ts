import { filterTasks, type TaskFilter } from "./taskFilters";
import { createPersistedTaskStore } from "./taskPersistence";
import type { Task } from "./taskStore";

function getAppRoot(): HTMLElement {
  const el = document.querySelector<HTMLElement>("#app");
  if (!el) {
    throw new Error("Missing #app");
  }
  return el;
}

const root = getAppRoot();

const store = createPersistedTaskStore(localStorage);
let filter: TaskFilter = "all";
const editingIds = new Set<string>();

function render(): void {
  root.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "Factory Target Web";
  root.append(heading);

  const form = document.createElement("form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>("[name=new-task]");
    if (!input) {
      return;
    }
    store.addTask(input.value);
    input.value = "";
    render();
  });

  const label = document.createElement("label");
  label.textContent = "New task";
  const newTaskInput = document.createElement("input");
  newTaskInput.type = "text";
  newTaskInput.name = "new-task";
  newTaskInput.id = "new-task";
  label.htmlFor = "new-task";
  label.append(newTaskInput);

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Add";

  form.append(label, addButton);
  root.append(form);

  const filters = document.createElement("div");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", "Task filters");
  for (const name of ["All", "Active", "Done"] as const) {
    const key: TaskFilter =
      name === "All" ? "all" : name === "Active" ? "active" : "done";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = name;
    const selected = filter === key;
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
    btn.addEventListener("click", () => {
      filter = key;
      render();
    });
    filters.append(btn);
  }
  root.append(filters);

  const visible = filterTasks(store.getTasks(), filter);
  const list = document.createElement("ul");
  for (const task of visible) {
    list.append(renderTaskRow(task));
  }
  root.append(list);

  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Add a task or change the filter to see more.";
    root.append(empty);
  }
}

function renderTaskRow(task: Task): HTMLLIElement {
  const li = document.createElement("li");
  const editing = editingIds.has(task.id);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () => {
    store.setTaskCompleted(task.id, checkbox.checked);
    render();
  });
  li.append(checkbox);

  if (editing) {
    const titleAnchor = document.createElement("span");
    titleAnchor.textContent = task.title;
    titleAnchor.hidden = true;
    li.append(titleAnchor);

    const editor = document.createElement("input");
    editor.type = "text";
    editor.value = task.title;
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit(task.id, editor.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        editingIds.delete(task.id);
        render();
      }
    });
    li.append(editor);

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => commitEdit(task.id, editor.value));
    li.append(saveBtn);
  } else {
    const titleSpan = document.createElement("span");
    titleSpan.textContent = task.title;
    li.append(titleSpan);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      editingIds.add(task.id);
      render();
    });
    li.append(editBtn);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    if (window.confirm("Delete this task?")) {
      editingIds.delete(task.id);
      store.deleteTask(task.id);
      render();
    }
  });
  li.append(deleteBtn);

  return li;
}

function commitEdit(id: string, title: string): void {
  if (store.updateTaskTitle(id, title)) {
    editingIds.delete(id);
  }
  render();
}

render();
