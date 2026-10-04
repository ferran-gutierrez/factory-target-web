import { describe, expect, it } from "vitest";
import { footerText } from "../src/footerText";

describe("footerText", () => {
  it("returns exactly the factory phrase, one space, and the given year", () => {
    expect(footerText(2026)).toBe("Built by the LambdaLoopers factory 2026");
  });

  it("includes no characters before or after the phrase and year", () => {
    const result = footerText(1999);
    expect(result).toBe("Built by the LambdaLoopers factory 1999");
    expect(result).toMatch(/^Built by the LambdaLoopers factory \d+$/);
  });
});
