import { ParsedExclusionRule } from "@/modules/exclusion-rules/interfaces/ParsedExclusionRule";

export const isGlobalExclusion = (rule: ParsedExclusionRule) =>
  !rule.include.length;

// NFD leaves ł as a base letter, so it is mapped by hand.
export const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("ł", "l");
