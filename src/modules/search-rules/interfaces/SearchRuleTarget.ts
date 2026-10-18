export interface SearchRuleTarget {
  matchSearchRules(
    matches: (name: string) => boolean,
    onlyNew: boolean
  ): Promise<{ matched: number; unmatched: number }>;
}
