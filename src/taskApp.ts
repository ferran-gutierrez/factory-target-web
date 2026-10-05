import { isTaskOverdue, localCalendarDay, sortTasksByDueDate } from "./taskDates";
import { EMPTY_STATE_MESSAGE, type TaskFilter } from "./taskFilters";
import {
  filterTasksByStatusAndSearch,
  NO_SEARCH_MATCH_MESSAGE,
  shouldShowAddTaskEmptyState,
  shouldShowNoMatchMessage,
} from "./taskSearch";
import { formatPriorityLabel, sortTasksByPriority } from "./taskPriority";
import {
  parseImportTasks,
  serializeTasksForExport,
} from "./taskImportExport";
import { createTaskStore, type Task, type TaskPriority } from "./taskStore";

type SortMode = "creation" | "due" | "priority";

export function mountTaskApp(app: HTMLElement): void {
  const store = createTaskStore();
  let filter: TaskFilter = "all";
  let sortMode: SortMode = "creation";
  let editingId: string | null = null;

  const heading = document.createElement("h1");
  heading.textContent = "Factory Target Web";

  const form = document.createElement("form");
  form.setAttribute("aria-label", "Add task");

  const taskInput = document.createElement("input");
  taskInput.type = "text";
  taskInput.id = "task-title";
  taskInput.setAttribute("aria-label", "Task title");

  const addDueDateInput = document.createElement("input");
  addDueDateInput.type = "date";
  addDueDateInput.id = "task-due-date";

  const addDueDateLabel = document.createElement("label");
  addDueDateLabel.htmlFor = addDueDateInput.id;
  addDueDateLabel.textContent = "Due date";

  const addPrioritySelect = document.createElement("select");
  addPrioritySelect.id = "task-priority";
  addPrioritySelect.setAttribute("aria-label", "Priority");
  for (const [value, label] of [
    ["low", "Low"],
    ["normal", "Normal"],
    ["high", "High"],
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (value === "normal") {
      option.selected = true;
    }
    addPrioritySelect.append(option);
  }

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Add task";

  form.append(
    taskInput,
    addDueDateLabel,
    addDueDateInput,
    addPrioritySelect,
    addButton,
  );

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

  const sortBar = document.createElement("div");
  sortBar.setAttribute("role", "group");
  sortBar.setAttribute("aria-label", "Task sort");

  function makeSortButton(label: string, value: SortMode): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", value === sortMode ? "true" : "false");
    btn.addEventListener("click", () => {
      sortMode = value;
      render();
    });
    return btn;
  }

  const sortCreation = makeSortButton("Creation order", "creation");
  const sortDue = makeSortButton("Due date", "due");
  const sortPriority = makeSortButton("Priority", "priority");
  sortBar.append(sortCreation, sortDue, sortPriority);

  const importExportBar = document.createElement("div");
  importExportBar.setAttribute("role", "group");
  importExportBar.setAttribute("aria-label", "Import and export tasks");

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Export tasks";

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.textContent = "Import tasks";

  const importFileInput = document.createElement("input");
  importFileInput.type = "file";
  importFileInput.accept = ".json,application/json";
  importFileInput.hidden = true;

  importExportBar.append(exportButton, importButton, importFileInput);

  const importError = document.createElement("div");
  importError.setAttribute("role", "alert");
  importError.hidden = true;

  const skipNotice = document.createElement("div");
  skipNotice.setAttribute("role", "status");
  const initialSkipped = store.getInitialSkippedCount();
  if (initialSkipped > 0) {
    skipNotice.textContent = `${initialSkipped} invalid stored task${
      initialSkipped === 1 ? "" : "s"
    } skipped during load.`;
  } else {
    skipNotice.hidden = true;
  }

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.setAttribute("aria-label", "Search tasks");

  const list = document.createElement("ul");
  const emptyState = document.createElement("p");
  emptyState.hidden = true;

  app.replaceChildren(
    heading,
    form,
    filterBar,
    sortBar,
    importExportBar,
    importError,
    skipNotice,
    searchInput,
    list,
    emptyState,
  );

  searchInput.addEventListener("input", () => {
    render();
  });

  function clearImportError(): void {
    importError.hidden = true;
    importError.textContent = "";
  }

  function showImportError(message: string): void {
    importError.textContent = message;
    importError.hidden = false;
  }

  exportButton.addEventListener("click", () => {
    clearImportError();
    const json = serializeTasksForExport(store.getTasks());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tasks.json";
    anchor.click();
    URL.revokeObjectURL(url);
  });

  importButton.addEventListener("click", () => {
    importFileInput.click();
  });

  importFileInput.addEventListener("change", () => {
    const file = importFileInput.files?.[0];
    importFileInput.value = "";
    if (!file) {
      return;
    }
    void file.text().then(
      (text) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          showImportError("Invalid import file: could not parse JSON.");
          return;
        }
        const result = parseImportTasks(parsed);
        if (!result.ok) {
          showImportError(
            "Invalid import file: tasks must be a JSON array of valid task objects.",
          );
          return;
        }
        const confirmed = window.confirm(
          "Replace all tasks with the imported list?",
        );
        if (!confirmed) {
          return;
        }
        clearImportError();
        store.replaceTasks(result.tasks);
        editingId = null;
        render();
      },
      () => {
        showImportError("Invalid import file: could not read the selected file.");
      },
    );
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const due = addDueDateInput.value.trim();
    const priority = addPrioritySelect.value as TaskPriority;
    if (
      store.addTask(
        taskInput.value,
        due.length > 0 ? due : undefined,
        priority,
      )
    ) {
      taskInput.value = "";
      addDueDateInput.value = "";
      addPrioritySelect.value = "normal";
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

  function updateSortButtons(): void {
    sortCreation.setAttribute(
      "aria-pressed",
      sortMode === "creation" ? "true" : "false",
    );
    sortDue.setAttribute("aria-pressed", sortMode === "due" ? "true" : "false");
    sortPriority.setAttribute(
      "aria-pressed",
      sortMode === "priority" ? "true" : "false",
    );
  }

  function renderTaskItem(task: Task): HTMLLIElement {
    const item = document.createElement("li");
    const isEditing = editingId === task.id;
    const referenceDay = localCalendarDay();

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

      const dueInput = document.createElement("input");
      dueInput.type = "date";
      dueInput.id = `edit-due-${task.id}`;
      dueInput.value = task.dueDate ?? "";

      const editDueLabel = document.createElement("label");
      editDueLabel.htmlFor = dueInput.id;
      editDueLabel.textContent = "Edit due date";

      const editPrioritySelect = document.createElement("select");
      editPrioritySelect.setAttribute("aria-label", "Edit priority");
      for (const [value, label] of [
        ["low", "Low"],
        ["normal", "Normal"],
        ["high", "High"],
      ] as const) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        if (value === task.priority) {
          option.selected = true;
        }
        editPrioritySelect.append(option);
      }

      const clearDueButton = document.createElement("button");
      clearDueButton.type = "button";
      clearDueButton.textContent = "Clear due date";
      clearDueButton.addEventListener("click", () => {
        dueInput.value = "";
      });

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "Save";
      saveButton.addEventListener("click", () => {
        const due = dueInput.value.trim();
        store.updateTask(
          task.id,
          editInput.value,
          due.length > 0 ? due : undefined,
          editPrioritySelect.value as TaskPriority,
        );
        editingId = null;
        render();
      });

      item.append(
        checkbox,
        titleHint,
        editLabel,
        editInput,
        editDueLabel,
        dueInput,
        editPrioritySelect,
        clearDueButton,
        saveButton,
      );
    } else {
      if (task.priority === "high") {
        item.setAttribute("data-priority", "high");
      }

      const titleSpan = document.createElement("span");
      titleSpan.textContent = task.title;

      const priorityLabel = formatPriorityLabel(task.priority);
      const priorityEl = document.createElement("small");
      priorityEl.setAttribute("aria-label", `Priority ${priorityLabel}`);
      priorityEl.textContent = priorityLabel;

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

      item.append(checkbox, titleSpan, priorityEl);

      if (task.dueDate) {
        const dueEl = document.createElement("time");
        dueEl.setAttribute("aria-label", `Due date ${task.dueDate}`);
        dueEl.textContent = task.dueDate;
        item.append(dueEl);
      }

      if (isTaskOverdue(task, referenceDay)) {
        const overdueEl = document.createElement("em");
        overdueEl.textContent = "Overdue";
        item.append(overdueEl);
      }

      item.append(editButton, deleteButton);
    }

    return item;
  }

  function render(): void {
    updateFilterButtons();
    updateSortButtons();
    const allTasks = store.getTasks();
    const searchQuery = searchInput.value;
    let visible = filterTasksByStatusAndSearch(allTasks, filter, searchQuery);
    if (sortMode === "due") {
      visible = sortTasksByDueDate(visible);
    } else if (sortMode === "priority") {
      visible = sortTasksByPriority(visible);
    }
    list.replaceChildren(...visible.map(renderTaskItem));

    const showAddTaskEmpty = shouldShowAddTaskEmptyState(
      allTasks.length,
      visible.length,
      searchQuery,
    );
    const showNoMatch = shouldShowNoMatchMessage(
      allTasks.length,
      visible.length,
      searchQuery,
    );
    const showEmpty = showAddTaskEmpty || showNoMatch;
    emptyState.hidden = !showEmpty;
    if (showAddTaskEmpty) {
      emptyState.textContent = EMPTY_STATE_MESSAGE;
    } else if (showNoMatch) {
      emptyState.textContent = NO_SEARCH_MATCH_MESSAGE;
    }
  }

  render();
}
