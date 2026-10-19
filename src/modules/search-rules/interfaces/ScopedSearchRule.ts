import { ParsedSearchRule } from "@/modules/search-rules/interfaces/ParsedSearchRule";

export interface ScopedSearchRule {
  rule: ParsedSearchRule;
  scope: number | null;
}
