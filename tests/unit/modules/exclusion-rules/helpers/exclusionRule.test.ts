import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/modules/exclusion-rules/helpers/exclusionRule";

describe("normalizeSearchText", () => {
  it("lowercases and strips diacritics, including ł", () => {
    expect(normalizeSearchText("Łódź ŻÓŁW Café")).toBe("lodz zolw cafe");
  });
});
