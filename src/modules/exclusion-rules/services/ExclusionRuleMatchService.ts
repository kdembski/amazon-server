import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import { ExclusionRuleFingerprintRepository } from "@/modules/exclusion-rules/repositories/ExclusionRuleFingerprintRepository";
import { ScopedExclusionRule } from "@/modules/exclusion-rules/interfaces/ScopedExclusionRule";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ScopedExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ScopedExclusionRuleMatcher";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

type ExclusionRuleRow = Awaited<ReturnType<ExclusionRuleTarget["getExclusionRules"]>>[number];

export class ExclusionRuleMatchService {
  private targets;
  private parser;
  private logger;
  private fingerprintRepository;
  private fingerprints = new Map<ExclusionRuleTarget, Map<string, string>>();
  private isRunning = false;

  constructor(
    targets: ExclusionRuleTarget[],
    parser = new ExclusionRuleParser(),
    logger = SystemLogService.getInstance(),
    fingerprintRepository = new ExclusionRuleFingerprintRepository()
  ) {
    this.targets = targets;
    this.parser = parser;
    this.logger = logger;
    this.fingerprintRepository = fingerprintRepository;
  }

  // Rematches the ads of the scopes whose rules or active flag differ from the
  // last successful run, kept across restarts (every ad when a rule without a
  // scope changed), otherwise only the ads that were never checked.
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
    const fingerprint = this.getFingerprint(exclusionRules, activeScopes);
    const only = this.getChangedScopes(await this.getPreviousFingerprint(target), fingerprint);
    const startedAt = Date.now();

    const result = await target.matchExclusionRules(this.getIsExcluded(exclusionRules, activeScopes), only);
    this.fingerprints.set(target, fingerprint);

    if (only !== "new") {
      await this.storeFingerprint(target, fingerprint);
      this.logRematch(target, exclusionRules.length, activeScopes, only, result, Date.now() - startedAt);
    }
  }

  // The fingerprint of the last run in this process, otherwise the stored one
  private async getPreviousFingerprint(target: ExclusionRuleTarget) {
    return this.fingerprints.get(target) ?? (await this.getStoredFingerprint(target));
  }

  // An ad of an inactive scope is excluded without matching its name
  private getIsExcluded(rules: ExclusionRuleRow[], activeScopes: number[]) {
    const active = new Set(activeScopes);
    const matcher = new ScopedExclusionRuleMatcher(this.parseExclusionRules(rules));
    return (name: string, scope: number | null) => {
      return (scope !== null && !active.has(scope)) || matcher.excludes(name, scope);
    };
  }

  private logRematch(
    target: ExclusionRuleTarget,
    rules: number,
    activeScopes: number[],
    scopes: number[] | undefined,
    { excluded, included, scanned }: { excluded: number; included: number; scanned: number },
    durationMs: number
  ) {
    this.logger.info(
      "ExclusionRuleMatchService",
      `${rules} exclusion rules excluded ${excluded} and included ${included} ads`,
      {
        target: target.constructor.name,
        rules,
        activeScopes,
        scopes: scopes ?? null,
        excluded,
        included,
        scanned,
        durationMs,
      }
    );
  }

  // Without a stored fingerprint every ad is rematched
  private async getStoredFingerprint(target: ExclusionRuleTarget) {
    try {
      return await this.fingerprintRepository.getByMarketplace(target.marketplace);
    } catch (error) {
      this.logger.warn(
        "ExclusionRuleMatchService",
        `Reading the exclusion rule fingerprint of ${target.marketplace} failed`,
        { error, marketplace: target.marketplace }
      );
      return undefined;
    }
  }

  private async storeFingerprint(
    target: ExclusionRuleTarget,
    fingerprint: Map<string, string>
  ) {
    try {
      await this.fingerprintRepository.set(target.marketplace, fingerprint);
    } catch (error) {
      this.logger.error(
        "ExclusionRuleMatchService",
        `Storing the exclusion rule fingerprint of ${target.marketplace} failed`,
        { error, marketplace: target.marketplace }
      );
    }
  }

  // One fingerprint per scope; the key "" holds the rules without a scope
  private getFingerprint(
    rules: ExclusionRuleRow[],
    activeScopes: number[]
  ) {
    const lines = new Map<string, string[]>();
    const add = (key: string, line: string) => {
      lines.set(key, [...(lines.get(key) ?? []), line]);
    };
    rules.forEach((rule) => add(String(rule.scope ?? ""), `${rule.inverted}\t${rule.value}`));
    activeScopes.forEach((scope) => add(String(scope), "active"));
    return new Map([...lines].map(([key, values]) => [key, values.sort().join("\n")]));
  }

  private getChangedScopes(
    previous: Map<string, string> | undefined,
    current: Map<string, string>
  ): "new" | number[] | undefined {
    if (!previous || previous.get("") !== current.get("")) return undefined;

    const keys = new Set([...previous.keys(), ...current.keys()]);
    const changed = [...keys]
      .filter((key) => previous.get(key) !== current.get(key))
      .map(Number)
      .sort((a, b) => a - b);
    return changed.length ? changed : "new";
  }

  private parseExclusionRules(
    rules: ExclusionRuleRow[]
  ): ScopedExclusionRule[] {
    return rules.flatMap(({ value, scope, inverted }) => {
      try {
        return [{ rule: this.parser.parse(value), scope, inverted }];
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
