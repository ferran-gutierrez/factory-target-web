// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assignFileToInput, ensureDataTransfer } from "./dataTransferPolyfill";
import { mountTaskApp } from "../src/taskApp";
import type { Task } from "../src/taskStore";
import { loadTasks, TASKS_STORAGE_KEY } from "../src/taskPersistence";
import { parseImportTasks, serializeTasksForExport } from "../src/taskImportExport";

type PriorityLabel = "Low" | "Normal" | "High";

function createStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

function mountFreshApp(): void {
  document.body.innerHTML = `<main id="app"></main>`;
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) {
    throw new Error("Missing #app");
  }
  mountTaskApp(root);
}

function getTaskInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Task title"]',
  );
  if (!input) {
    throw new Error("Task entry control not found");
  }
  return input;
}

function getAddDueDateInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    'form[aria-label="Add task"] input[type="date"]',
  );
  if (!input) {
    throw new Error("Add-task due date control not found");
  }
  return input;
}

function getAddPrioritySelect(): HTMLSelectElement {
  const select = document.querySelector<HTMLSelectElement>(
    'form[aria-label="Add task"] [aria-label="Priority"]',
  );
  if (!select) {
    throw new Error("Add-task priority control not found");
  }
  return select;
}

function setAddFormPriority(label: PriorityLabel): void {
  const select = getAddPrioritySelect();
  const option = [...select.options].find(
    (o) => o.textContent?.trim() === label,
  );
  if (!option) {
    throw new Error(`Priority option "${label}" not found`);
  }
  select.value = option.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function submitTask(
  title: string,
  options?: { dueDate?: string; priority?: PriorityLabel },
): void {
  const input = getTaskInput();
  input.value = title;
  if (options?.dueDate !== undefined) {
    getAddDueDateInput().value = options.dueDate;
  }
  if (options?.priority !== undefined) {
    setAddFormPriority(options.priority);
  }
  input.form?.requestSubmit();
}

function clickFilter(name: "All" | "Active" | "Done"): void {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === name,
  );
  if (!btn) {
    throw new Error(`Filter button "${name}" not found`);
  }
  btn.click();
}

function listTitlesInDomOrder(): string[] {
  return [...document.querySelectorAll<HTMLLIElement>("ul li")].map((li) => {
    const span = li.querySelector("span");
    return span?.textContent ?? "";
  });
}

function getExportButton(): HTMLButtonElement {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === "Export tasks",
  );
  if (!btn) {
    throw new Error("Export tasks control not found");
  }
  return btn;
}

function getImportFileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error("Import file input not found");
  }
  return input;
}

let capturedExportBlob: Blob | undefined;

function stubExportDownloadCapture(): void {
  capturedExportBlob = undefined;
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    capturedExportBlob = blob as Blob;
    return "blob:mock-export";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
}

async function readCapturedExportJson(): Promise<unknown> {
  if (!capturedExportBlob) {
    throw new Error("No export blob captured");
  }
  const text = await capturedExportBlob.text();
  return JSON.parse(text) as unknown;
}

async function selectImportFile(
  content: string,
  filename = "import.json",
): Promise<void> {
  const input = getImportFileInput();
  const file = new File([content], filename, { type: "application/json" });
  assignFileToInput(input, file);
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function visibleImportErrorText(): string | null {
  const alert = document.querySelector('[role="alert"]');
  if (alert && !alert.hasAttribute("hidden")) {
    return alert.textContent;
  }
  const live = document.querySelector("[aria-live]");
  if (live && live.textContent && live.textContent.trim().length > 0) {
    return live.textContent;
  }
  return null;
}

describe("task import/export validation", () => {
  it("REQ-4: accepts a valid import array and defaults missing priority to normal", () => {
    const payload = [
      {
        id: "a",
        title: "One",
        completed: false,
        priority: "high",
        dueDate: "2030-01-01",
      },
      { id: "b", title: "Two", completed: true },
    ];

    const result = parseImportTasks(payload);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.tasks).toEqual([
      {
        id: "a",
        title: "One",
        completed: false,
        priority: "high",
        dueDate: "2030-01-01",
      },
      {
        id: "b",
        title: "Two",
        completed: true,
        priority: "normal",
      },
    ]);
  });

  it("REQ-5: rejects non-array JSON and invalid task objects", () => {
    expect(parseImportTasks({ not: "an array" }).ok).toBe(false);
    expect(parseImportTasks([{ title: "missing id", completed: false }]).ok).toBe(
      false,
    );
    expect(
      parseImportTasks([
        { id: "x", title: 42, completed: false, priority: "normal" },
      ]).ok,
    ).toBe(false);
    expect(
      parseImportTasks([
        { id: "x", title: "Bad priority", completed: false, priority: "urgent" },
      ]).ok,
    ).toBe(false);
    expect(
      parseImportTasks([
        { id: "x", title: "Bad due", completed: false, dueDate: 123 },
      ]).ok,
    ).toBe(false);
    expect(
      parseImportTasks([
        { id: 1, title: "Numeric id", completed: false, priority: "normal" },
      ]).ok,
    ).toBe(false);
    expect(
      parseImportTasks([
        {
          id: "x",
          title: "String completed",
          completed: "yes",
          priority: "normal",
        },
      ]).ok,
    ).toBe(false);
  });
});

describe("task import/export UI", () => {
  beforeEach(() => {
    ensureDataTransfer();
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", createStorage());
    stubExportDownloadCapture();
    mountFreshApp();
  });

  it("REQ-1: Export tasks downloads JSON array of all stored tasks regardless of filter", async () => {
    submitTask("Visible active");
    submitTask("Hidden done");
    const doneItem = [...document.querySelectorAll("ul li")].find((li) =>
      li.textContent?.includes("Hidden done"),
    );
    const checkbox = doneItem?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    if (checkbox) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    clickFilter("Active");
    expect(listTitlesInDomOrder()).toEqual(["Visible active"]);

    getExportButton().click();

    const exported = (await readCapturedExportJson()) as Task[];
    expect(Array.isArray(exported)).toBe(true);
    expect(exported.map((t) => t.title).sort()).toEqual(
      ["Hidden done", "Visible active"].sort(),
    );
    expect(exported).toHaveLength(2);
  });

  it("REQ-2: export includes required fields and omits dueDate when unset", async () => {
    submitTask("Export me");
    submitTask("Done high", {
      dueDate: "2030-05-20",
      priority: "High",
    });
    const highItem = [...document.querySelectorAll("ul li")].find((li) =>
      li.textContent?.includes("Done high"),
    );
    const checkbox = highItem?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    if (checkbox) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    getExportButton().click();
    const exported = (await readCapturedExportJson()) as Record<string, unknown>[];

    const exportMe = exported.find((t) => t.title === "Export me");
    const doneHigh = exported.find((t) => t.title === "Done high");

    expect(exportMe).toMatchObject({
      title: "Export me",
      completed: false,
      priority: "normal",
    });
    expect(exportMe?.dueDate).toBeUndefined();
    expect(typeof exportMe?.id).toBe("string");

    expect(doneHigh).toMatchObject({
      title: "Done high",
      completed: true,
      priority: "high",
      dueDate: "2030-05-20",
    });
    expect(typeof doneHigh?.id).toBe("string");
  });

  it("REQ-6: valid file and confirmed import replaces list and localStorage", async () => {
    submitTask("Old task");
    expect(listTitlesInDomOrder()).toEqual(["Old task"]);

    const importPayload = JSON.stringify([
      { id: "imp-1", title: "From file A", completed: false, priority: "low" },
      { id: "imp-2", title: "From file B", completed: true, priority: "high" },
    ]);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await selectImportFile(importPayload);

    expect(listTitlesInDomOrder()).toEqual(["From file A", "From file B"]);
    expect(document.body.textContent).not.toContain("Old task");

    const stored = loadTasks();
    expect(stored.map((t) => t.title)).toEqual(["From file A", "From file B"]);
    expect(JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY)!)).toEqual(
      JSON.parse(importPayload),
    );
  });

  it("REQ-7: valid file and dismissed confirm leaves list and localStorage unchanged", async () => {
    submitTask("Keep me");
    const beforeStorage = localStorage.getItem(TASKS_STORAGE_KEY);

    vi.spyOn(window, "confirm").mockReturnValue(false);
    await selectImportFile(
      JSON.stringify([
        { id: "new", title: "Would replace", completed: false, priority: "normal" },
      ]),
    );

    expect(listTitlesInDomOrder()).toEqual(["Keep me"]);
    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(beforeStorage);
  });

  it("REQ-8: invalid import file shows visible error and leaves list unchanged", async () => {
    submitTask("First");
    submitTask("Second");
    const beforeTitles = listTitlesInDomOrder();

    await selectImportFile(JSON.stringify({ not: "an array" }));
    const errorAfterObject = visibleImportErrorText();
    expect(errorAfterObject).toBeTruthy();
    expect(errorAfterObject!.length).toBeGreaterThan(0);
    expect(listTitlesInDomOrder()).toEqual(beforeTitles);

    await selectImportFile(JSON.stringify([{ title: "missing id" }]));
    const errorAfterMissingId = visibleImportErrorText();
    expect(errorAfterMissingId).toBeTruthy();
    expect(listTitlesInDomOrder()).toEqual(beforeTitles);
  });
});

describe("task import/export serialization", () => {
  it("REQ-2: serializeTasksForExport matches persisted task shape", () => {
    const tasks: Task[] = [
      { id: "1", title: "Export me", completed: false, priority: "normal" },
      {
        id: "2",
        title: "Done high",
        completed: true,
        priority: "high",
        dueDate: "2030-05-20",
      },
    ];

    const json = serializeTasksForExport(tasks);
    const parsed = JSON.parse(json) as Record<string, unknown>[];

    expect(parsed.find((t) => t.title === "Export me")).toMatchObject({
      title: "Export me",
      completed: false,
      priority: "normal",
    });
    expect(parsed.find((t) => t.title === "Export me")?.dueDate).toBeUndefined();

    expect(parsed.find((t) => t.title === "Done high")).toMatchObject({
      title: "Done high",
      completed: true,
      priority: "high",
      dueDate: "2030-05-20",
    });
  });
});
