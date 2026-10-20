import { describe, expect, it } from "vitest";
import {
  isGlobalExclusion,
  normalizeSearchText,
} from "@/modules/exclusion-rules/helpers/exclusionRule";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";

const parser = new ExclusionRuleParser();
const parseExclusionRule = (value: string) => parser.parse(value);

describe("isGlobalExclusion", () => {
  it("is true only for rules without a positive member", () => {
    expect(isGlobalExclusion(parseExclusionRule("!used"))).toBe(true);
    expect(isGlobalExclusion(parseExclusionRule("sony+!used"))).toBe(false);
  });
});

describe("normalizeSearchText", () => {
  it("lowercases and strips diacritics, including ł", () => {
    expect(normalizeSearchText("Łódź ŻÓŁW Café")).toBe("lodz zolw cafe");
  });
});
