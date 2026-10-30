export interface ExclusionRuleTarget {
  getExclusionRules(): Promise<{ value: string; scope: number | null; inverted: boolean }[]>;
  getActiveScopes(): Promise<number[]>;
  // only: "new" = ads never checked, scope ids = every ad of these scopes, none = every ad
  matchExclusionRules(
    isExcluded: (name: string, scope: number | null) => boolean,
    only?: "new" | number[]
  ): Promise<{ excluded: number; included: number; scanned: number }>;
}
