import {
  EMPTY_STATE_MESSAGE,
  filterTasks,
  shouldShowEmptyState,
  type TaskFilter,
} from "./taskFilters";
import { createTaskStore, type Task } from "./taskStore";

export function mountTaskApp(app: HTMLElement): void {
  const store = createTaskStore();
  let filter: TaskFilter = "all";
  let editingId: string | null = null;

  const heading = document.createElement("h1");
  heading.textContent = "Factory Target Web";

  const form = document.createElement("form");
  form.setAttribute("aria-label", "Add task");

  const taskInput = document.createElement("input");
  taskInput.type = "text";
  taskInput.id = "task-title";
  taskInput.setAttribute("aria-label", "Task title");

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Add task";

  form.append(taskInput, addButton);

  const filterBar = document.createElement("div");
  filterBar.setAttribute("role", "group");
  filterBar.setAttribute("aria-label", "Task filters");

  function makeFilterButton(label: string, value: TaskFilter): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", value === filter ? "true" : "false");
    btn.addEventListener("click", () => {
      filter = value;
      editingId = null;
      render();
    });
    return btn;
  }

  const filterAll = makeFilterButton("All", "all");
  const filterActive = makeFilterButton("Active", "active");
  const filterDone = makeFilterButton("Done", "done");
  filterBar.append(filterAll, filterActive, filterDone);

  const list = document.createElement("ul");
  const emptyState = document.createElement("p");
  emptyState.hidden = true;

  app.replaceChildren(heading, form, filterBar, list, emptyState);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (store.addTask(taskInput.value)) {
      taskInput.value = "";
    }
    render();
  });

  function updateFilterButtons(): void {
    for (const [btn, value] of [
      [filterAll, "all"],
      [filterActive, "active"],
      [filterDone, "done"],
    ] as const) {
      btn.setAttribute("aria-pressed", filter === value ? "true" : "false");
    }
  }

  function renderTaskItem(task: Task): HTMLLIElement {
    const item = document.createElement("li");
    const isEditing = editingId === task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark complete");
    checkbox.addEventListener("change", () => {
      store.setTaskCompleted(task.id, checkbox.checked);
      render();
    });

    if (isEditing) {
      const titleHint = document.createElement("span");
      titleHint.textContent = task.title;
      titleHint.hidden = true;

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.id = `edit-task-${task.id}`;
      editInput.value = task.title;

      const editLabel = document.createElement("label");
      editLabel.htmlFor = editInput.id;
      editLabel.textContent = "Edit task title";

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "Save";
      saveButton.addEventListener("click", () => {
        store.updateTaskTitle(task.id, editInput.value);
        editingId = null;
        render();
      });

      item.append(checkbox, titleHint, editLabel, editInput, saveButton);
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
        const confirmed = window.confirm("Delete this task?");
        store.deleteTask(task.id, confirmed);
        render();
      });

      item.append(checkbox, titleSpan, editButton, deleteButton);
    }

    return item;
  }

  function render(): void {
    updateFilterButtons();
    const visible = filterTasks(store.getTasks(), filter);
    list.replaceChildren(...visible.map(renderTaskItem));

    const showEmpty = shouldShowEmptyState(visible.length);
    emptyState.hidden = !showEmpty;
    if (showEmpty) {
      emptyState.textContent = EMPTY_STATE_MESSAGE;
    }
  }

  render();
}
