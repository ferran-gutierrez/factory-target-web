import { afterEach, describe, expect, it, vi } from "vitest";
import { mountApp } from "../src/mount";

type StubElement = {
  tagName: string;
  children: StubElement[];
  appendChild(child: StubElement): void;
  append(...nodes: StubElement[]): void;
  querySelectorAll(selector: string): StubElement[];
};

function createStubElement(tagName: string): StubElement {
  const children: StubElement[] = [];
  const el: StubElement = {
    tagName: tagName.toUpperCase(),
    children,
    appendChild(child) {
      children.push(child);
    },
    append(...nodes) {
      for (const node of nodes) {
        this.appendChild(node);
      }
    },
    querySelectorAll(selector) {
      if (selector !== "footer") {
        return [];
      }
      const matches: StubElement[] = [];
      const walk = (node: StubElement) => {
        if (node.tagName === "FOOTER") {
          matches.push(node);
        }
        for (const child of node.children) {
          walk(child);
        }
      };
      walk(el);
      return matches;
    },
  };
  return el;
}

function collectFootersInTree(root: StubElement): StubElement[] {
  return root.querySelectorAll("footer");
}

describe("mountApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("completes without throwing when the root container is null", () => {
    expect(() => mountApp(null)).not.toThrow();
  });

  it("creates no footer in the container tree when the root container is null", () => {
    const createdFooters: StubElement[] = [];

    vi.stubGlobal("document", {
      createElement(tagName: string) {
        const el = createStubElement(tagName);
        if (tagName.toLowerCase() === "footer") {
          createdFooters.push(el);
        }
        return el;
      },
    });

    const orphanTree = createStubElement("div");

    mountApp(null);

    expect(createdFooters).toHaveLength(0);
    expect(collectFootersInTree(orphanTree)).toHaveLength(0);
  });
});
