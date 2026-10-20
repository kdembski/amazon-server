export interface ExclusionRuleTarget {
  getExclusionRules(): Promise<{ value: string; scope: number | null }[]>;
  matchExclusionRules(
    isExcluded: (name: string, scope: number | null) => boolean,
    onlyNew: boolean
  ): Promise<{ excluded: number; included: number }>;
}
