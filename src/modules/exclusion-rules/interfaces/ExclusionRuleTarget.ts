export interface ExclusionRuleTarget {
  getExclusionRules(): Promise<{ value: string; scope: number | null }[]>;
  matchExclusionRules(
    matches: (name: string, scope: number | null) => boolean,
    onlyNew: boolean
  ): Promise<{ matched: number; unmatched: number }>;
}
