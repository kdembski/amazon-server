import { ParsedExclusionRule } from "@/modules/exclusion-rules/interfaces/ParsedExclusionRule";

export interface ScopedExclusionRule {
  rule: ParsedExclusionRule;
  scope: number | null;
}
