import { describe, expect, it } from "vitest";
import { getSpacing } from "@/shared/discord/spacing";

describe("getSpacing", () => {
  it("joins N left-to-right marks with spaces", () => {
    expect(getSpacing(3)).toBe("\u200E \u200E \u200E");
  });

  it("returns empty string for 0", () => {
    expect(getSpacing(0)).toBe("");
  });
});
