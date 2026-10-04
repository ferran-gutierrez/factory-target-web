import { describe, expect, it } from "vitest";

import { getEmbeddedPathDataByteLength } from "../src/world-map/path-data-byte-length";

const TWO_MIB_BYTES = 2 * 1024 * 1024;

describe("world map path data size (REQ-5)", () => {
  it("REQ-5: embeds at least 2 MiB of raw path d string content before build compression", () => {
    const bytes = getEmbeddedPathDataByteLength();
    expect(bytes).toBeGreaterThanOrEqual(TWO_MIB_BYTES);
  });
});
