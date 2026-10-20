import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import { ScopedExclusionRule } from "@/modules/exclusion-rules/interfaces/ScopedExclusionRule";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ScopedExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ScopedExclusionRuleMatcher";

export class ExclusionRuleMatchService {
  private targets;
  private parser;
  private fingerprints = new Map<ExclusionRuleTarget, string>();
  private isRunning = false;

  constructor(targets: ExclusionRuleTarget[], parser = new ExclusionRuleParser()) {
    this.targets = targets;
    this.parser = parser;
  }

  // Rematches every ad of a target when its rules differ from the last
  // successful run, otherwise only the ads that were never checked.
  async sync() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      for (const target of this.targets) {
        await this.syncTarget(target);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async syncTarget(target: ExclusionRuleTarget) {
    const exclusionRules = await target.getExclusionRules();
    const fingerprint = exclusionRules
      .map((rule) => `${rule.scope ?? ""}\t${rule.value}`)
      .sort()
      .join("\n");
    const changed = fingerprint !== this.fingerprints.get(target);
    const startedAt = Date.now();
    const matcher = new ScopedExclusionRuleMatcher(
      this.parseExclusionRules(exclusionRules)
    );

    const { excluded, included } = await target.matchExclusionRules(
      (name, scope) => matcher.excludes(name, scope),
      !changed
    );
    this.fingerprints.set(target, fingerprint);

    if (changed) {
      console.log(
        `ExclusionRuleMatchService: ${exclusionRules.length} exclusion rules excluded ${excluded} and included ${included} ads in ${Date.now() - startedAt} ms`
      );
    }
  }

  private parseExclusionRules(
    rules: { value: string; scope: number | null }[]
  ): ScopedExclusionRule[] {
    return rules.flatMap(({ value, scope }) => {
      try {
        return [{ rule: this.parser.parse(value), scope }];
      } catch (e) {
        console.error(
          `ExclusionRuleMatchService: skipped exclusion rule ${value}: ${e}`
        );
        return [];
      }
    });
  }
}
