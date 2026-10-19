import { describe, expect, it } from "vitest";
import {
  isGlobalExclusion,
  normalizeSearchText,
} from "@/modules/search-rules/helpers/searchRule";
import { SearchRuleParser } from "@/modules/search-rules/services/SearchRuleParser";

const parser = new SearchRuleParser();
const parseSearchRule = (value: string) => parser.parse(value);

describe("isGlobalExclusion", () => {
  it("is true only for rules without a positive member", () => {
    expect(isGlobalExclusion(parseSearchRule("!used"))).toBe(true);
    expect(isGlobalExclusion(parseSearchRule("sony+!used"))).toBe(false);
  });
});

describe("normalizeSearchText", () => {
  it("lowercases and strips diacritics, including ł", () => {
    expect(normalizeSearchText("Łódź ŻÓŁW Café")).toBe("lodz zolw cafe");
  });
});
