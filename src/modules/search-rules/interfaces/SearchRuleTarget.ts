export interface SearchRuleTarget {
  getSearchRules(): Promise<{ value: string; scope: number | null }[]>;
  matchSearchRules(
    matches: (name: string, scope: number | null) => boolean,
    onlyNew: boolean
  ): Promise<{ matched: number; unmatched: number }>;
}
