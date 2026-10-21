import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import { ScopedExclusionRule } from "@/modules/exclusion-rules/interfaces/ScopedExclusionRule";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ScopedExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ScopedExclusionRuleMatcher";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class ExclusionRuleMatchService {
  private targets;
  private parser;
  private logger;
  private fingerprints = new Map<ExclusionRuleTarget, string>();
  private isRunning = false;

  constructor(
    targets: ExclusionRuleTarget[],
    parser = new ExclusionRuleParser(),
    logger = SystemLogService.getInstance()
  ) {
    this.targets = targets;
    this.parser = parser;
    this.logger = logger;
  }

  // Rematches every ad of a target when its rules or active scopes differ from
  // the last successful run, otherwise only the ads that were never checked.
  async sync() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      for (const target of this.targets) {
        await this.syncTarget(target).catch((error) =>
          this.logger.error(
            "ExclusionRuleMatchService",
            `Exclusion rule matching of ${target.constructor.name} failed`,
            { error, target: target.constructor.name }
          )
        );
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async syncTarget(target: ExclusionRuleTarget) {
    const exclusionRules = await target.getExclusionRules();
    const activeScopes = await target.getActiveScopes();
    const fingerprint = [
      ...exclusionRules.map((rule) => `${rule.scope ?? ""}\t${rule.value}`).sort(),
      `active\t${[...activeScopes].sort((a, b) => a - b).join(",")}`,
    ].join("\n");
    const active = new Set(activeScopes);
    const changed = fingerprint !== this.fingerprints.get(target);
    const startedAt = Date.now();
    const matcher = new ScopedExclusionRuleMatcher(
      this.parseExclusionRules(exclusionRules)
    );

    const { excluded, included } = await target.matchExclusionRules(
      (name, scope) =>
        (scope !== null && !active.has(scope)) || matcher.excludes(name, scope),
      !changed
    );
    this.fingerprints.set(target, fingerprint);

    if (changed) {
      this.logger.info(
        "ExclusionRuleMatchService",
        `${exclusionRules.length} exclusion rules excluded ${excluded} and included ${included} ads`,
        {
          target: target.constructor.name,
          rules: exclusionRules.length,
          activeScopes: [...active],
          excluded,
          included,
          durationMs: Date.now() - startedAt,
        }
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
        this.logger.warn(
          "ExclusionRuleMatchService",
          `Skipped exclusion rule ${value}`,
          { value, scope, error: e }
        );
        return [];
      }
    });
  }
}
