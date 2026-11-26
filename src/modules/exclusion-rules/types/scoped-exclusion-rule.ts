import { ParsedExclusionRule } from "@/modules/exclusion-rules/types/parsed-exclusion-rule";

export interface ScopedExclusionRule {
  rule: ParsedExclusionRule;
  scope: number | null;
  inverted: boolean;
}
