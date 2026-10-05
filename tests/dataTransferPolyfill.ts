export function assignFileToInput(
  input: HTMLInputElement,
  file: File,
): void {
  const fileList = {
    0: file,
    length: 1,
    item(index: number): File | null {
      return index === 0 ? file : null;
    },
    *[Symbol.iterator]() {
      yield file;
    },
  };
  Object.defineProperty(input, "files", {
    configurable: true,
    value: fileList,
  });
}

export function ensureDataTransfer(): void {
  if (typeof globalThis.DataTransfer !== "undefined") {
    return;
  }
  class DataTransferStub {
    items = {
      add: (_file: File) => {},
    };
    get files(): FileList {
      return [] as unknown as FileList;
    }
  }
  globalThis.DataTransfer = DataTransferStub as unknown as typeof DataTransfer;
}
