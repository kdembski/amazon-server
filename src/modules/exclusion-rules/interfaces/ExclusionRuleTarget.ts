export interface ExclusionRuleTarget {
  getExclusionRules(): Promise<{ value: string; scope: number | null }[]>;
  getActiveScopes(): Promise<number[]>;
  matchExclusionRules(
    isExcluded: (name: string, scope: number | null) => boolean,
    onlyNew: boolean
  ): Promise<{ excluded: number; included: number }>;
}
