import { describe, expect, it, vi } from "vitest";
import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import {
  deferred,
  fakeExclusionRuleFingerprintRepository,
  fakeSystemLogService,
} from "../../../../support/fakes";

type Rule = { value: string; scope: number | null; inverted?: boolean };

const global = (...values: string[]): Rule[] =>
  values.map((value) => ({ value, scope: null, inverted: false }));

const fakeTarget = (rules: Rule[] = [], marketplace = "amazon") => ({
  marketplace,
  getExclusionRules: vi.fn().mockResolvedValue(rules),
  getActiveScopes: vi.fn().mockResolvedValue([1, 2]),
  matchExclusionRules: vi.fn().mockResolvedValue({ excluded: 0, included: 0, scanned: 0 }),
});

const setup = (rulesA: Rule[] = [], rulesB: Rule[] = []) => {
  const targetA = fakeTarget(rulesA);
  const targetB = fakeTarget(rulesB, "other");
  const logger = fakeSystemLogService();
  const fingerprints = fakeExclusionRuleFingerprintRepository();
  const service = new ExclusionRuleMatchService(
    [targetA, targetB] as unknown as ExclusionRuleTarget[],
    undefined,
    logger.service,
    fingerprints.repository
  );
  return {
    service,
    targetA,
    targetB,
    fingerprints,
    info: logger.info,
    warn: logger.warn,
    error: logger.error,
  };
};

const onlyArgs = (target: ReturnType<typeof fakeTarget>) =>
  target.matchExclusionRules.mock.calls.map((call) => call[1]);

describe("ExclusionRuleMatchService.sync", () => {
  it("runs every target with a matcher built from its own rules", async () => {
    const { service, targetA, targetB, info } = setup(global("drill"), [
      { value: "bose", scope: 2 },
    ]);

    await service.sync();

    const [matchesA, onlyA] = targetA.matchExclusionRules.mock.calls[0];
    const [matchesB, onlyB] = targetB.matchExclusionRules.mock.calls[0];
    expect(onlyA).toBeUndefined();
    expect(onlyB).toBeUndefined();
    expect(matchesA("Bosch drill", 1)).toBe(true);
    expect(matchesA("Bose QC45", 2)).toBe(false);
    expect(matchesB("Bose QC45", 2)).toBe(true);
    expect(matchesB("Bose QC45", 1)).toBe(false);
    info.mockRestore();
  });

  it("logs once per changed target", async () => {
    const { service, targetA, targetB, info } = setup(
      global("drill"),
      global("bose")
    );
    targetA.matchExclusionRules.mockResolvedValue({ excluded: 2, included: 1, scanned: 5 });
    targetB.matchExclusionRules.mockResolvedValue({ excluded: 2, included: 1, scanned: 5 });

    await service.sync();

    expect(info).toHaveBeenCalledTimes(2);
    for (const [source, message, context] of info.mock.calls) {
      expect(source).toBe("ExclusionRuleMatchService");
      expect(message).toBe("1 exclusion rules excluded 2 and included 1 ads");
      expect(context).toEqual({
        target: "Object",
        rules: 1,
        activeScopes: [1, 2],
        scopes: null,
        excluded: 2,
        included: 1,
        scanned: 5,
        durationMs: expect.any(Number),
      });
    }
    info.mockRestore();
  });

  it("runs the targets one after another", async () => {
    const { service, targetA, targetB, info } = setup(global("drill"));
    const first = deferred<{ excluded: number; included: number; scanned: number }>();
    targetA.matchExclusionRules.mockReturnValueOnce(first.promise);

    const running = service.sync();
    await vi.waitFor(() =>
      expect(targetA.matchExclusionRules).toHaveBeenCalledTimes(1)
    );
    expect(targetB.matchExclusionRules).not.toHaveBeenCalled();

    first.resolve({ excluded: 0, included: 0, scanned: 0 });
    await running;

    expect(targetB.matchExclusionRules).toHaveBeenCalledTimes(1);
    info.mockRestore();
  });

  it("skips an unparsable rule and logs it", async () => {
    const { service, targetA, info, warn } = setup(global("drill", "a++b"));

    await service.sync();

    expect(warn).toHaveBeenCalledWith(
      "ExclusionRuleMatchService",
      "Skipped exclusion rule a++b",
      {
        value: "a++b",
        scope: null,
        error: new Error('Exclusion rule "a++b" contains an empty part'),
      }
    );
    expect(targetA.matchExclusionRules.mock.calls[0][0]("drill", null)).toBe(true);
    info.mockRestore();
  });

  it("skips a rule made only of ! members and excludes by the others", async () => {
    const { service, targetA, info, warn } = setup(global("!a", "b"));

    await service.sync();

    expect(warn).toHaveBeenCalledWith(
      "ExclusionRuleMatchService",
      "Skipped exclusion rule !a",
      expect.objectContaining({
        error: new Error('Exclusion rule "!a" needs at least one phrase without !'),
      })
    );
    const [excludes] = targetA.matchExclusionRules.mock.calls[0];
    expect(excludes("b", null)).toBe(true);
    expect(excludes("a", null)).toBe(false);
    info.mockRestore();
  });

  it("excludes every ad of an inactive scope, whatever the rules", async () => {
    const { service, targetA, info } = setup();
    targetA.getActiveScopes.mockResolvedValue([1]);

    await service.sync();

    const [excludes] = targetA.matchExclusionRules.mock.calls[0];
    expect(excludes("Bosch drill", 1)).toBe(false);
    expect(excludes("Bosch drill", 2)).toBe(true);
    info.mockRestore();
  });

  it("rematches the scopes whose active flag changed, not when only their order does", async () => {
    const { service, targetA, info } = setup();
    targetA.getActiveScopes
      .mockResolvedValueOnce([1, 2])
      .mockResolvedValueOnce([2, 1])
      .mockResolvedValueOnce([2]);

    await service.sync();
    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, "new", [1]]);
    info.mockRestore();
  });

  it("passes only = \"new\" while the rules are unchanged, in any order", async () => {
    const { service, targetA, info } = setup();
    targetA.getExclusionRules
      .mockResolvedValueOnce(global("sony", "bose"))
      .mockResolvedValueOnce(global("bose", "sony"));

    await service.sync();
    info.mockClear();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, "new"]);
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("rematches only the target whose rules changed", async () => {
    const { service, targetA, targetB, info } = setup(
      global("sony"),
      global("bose")
    );
    targetB.getExclusionRules
      .mockResolvedValueOnce(global("bose"))
      .mockResolvedValueOnce(global("bose+!used"));

    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, "new"]);
    expect(onlyArgs(targetB)).toEqual([undefined, undefined]);
    info.mockRestore();
  });

  it("rematches every ad when a rule moves out of the global scope", async () => {
    const { service, targetA, info } = setup();
    targetA.getExclusionRules
      .mockResolvedValueOnce([{ value: "drill", scope: null }])
      .mockResolvedValueOnce([{ value: "drill", scope: 1 }]);

    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, undefined]);
    info.mockRestore();
  });

  it("rematches only the scopes whose rules changed", async () => {
    const { service, targetA, info } = setup();
    targetA.getExclusionRules
      .mockResolvedValueOnce([
        { value: "drill", scope: 1 },
        { value: "saw", scope: 2 },
        { value: "bose", scope: null },
      ])
      .mockResolvedValueOnce([
        { value: "drill", scope: 1 },
        { value: "hammer", scope: 3 },
        { value: "bose", scope: null },
      ]);

    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, [2, 3]]);
    expect(info.mock.lastCall?.[2]).toMatchObject({ scopes: [2, 3] });
    info.mockRestore();
  });

  it("rematches when only the inverted flag of a rule changed", async () => {
    const { service, targetA, info } = setup();
    targetA.getExclusionRules
      .mockResolvedValueOnce([{ value: "drill", scope: 1, inverted: false }])
      .mockResolvedValueOnce([{ value: "drill", scope: 1, inverted: true }]);

    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, [1]]);
    const [matches] = targetA.matchExclusionRules.mock.calls[1];
    expect(matches("Bosch drill", 1)).toBe(false);
    expect(matches("Bosch saw", 1)).toBe(true);
    info.mockRestore();
  });

  it("keeps the old fingerprint when a target throws, so the next run rematches it", async () => {
    const { service, targetA, targetB, info } = setup(
      global("drill"),
      global("drill")
    );
    targetB.matchExclusionRules.mockRejectedValueOnce(new Error("db down"));

    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, "new"]);
    expect(onlyArgs(targetB)).toEqual([undefined, undefined]);
    info.mockRestore();
  });

  it("logs a failing target and still syncs the next one", async () => {
    const logger = fakeSystemLogService();
    const targetA = fakeTarget(global("drill"));
    const targetB = fakeTarget(global("bose"));
    const error = new Error("db down");
    targetA.getExclusionRules.mockRejectedValueOnce(error);
    const service = new ExclusionRuleMatchService(
      [targetA, targetB] as unknown as ExclusionRuleTarget[],
      undefined,
      logger.service,
      fakeExclusionRuleFingerprintRepository().repository
    );

    await expect(service.sync()).resolves.toBeUndefined();

    expect(targetB.matchExclusionRules).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      "ExclusionRuleMatchService",
      "Exclusion rule matching of Object failed",
      { error, target: "Object" }
    );
  });

  it("stores the fingerprint after a rematch and not after a run of new ads", async () => {
    const { service, fingerprints, info } = setup([
      { value: "drill", scope: 1, inverted: false },
    ]);

    await service.sync();
    await service.sync();

    expect(fingerprints.set).toHaveBeenCalledTimes(2);
    expect(fingerprints.set).toHaveBeenCalledWith(
      "amazon",
      new Map([
        ["1", "active\nfalse\tdrill"],
        ["2", "active"],
      ])
    );
    expect(fingerprints.set).toHaveBeenCalledWith(
      "other",
      new Map([
        ["1", "active"],
        ["2", "active"],
      ])
    );
    info.mockRestore();
  });

  it("starts from the stored fingerprint after a restart", async () => {
    const rules = [
      { value: "drill", scope: 1 },
      { value: "saw", scope: 2 },
    ];
    const before = setup(rules);
    await before.service.sync();
    before.info.mockRestore();

    const targetA = fakeTarget([rules[0], { value: "hammer", scope: 2 }]);
    const targetB = fakeTarget([], "other");
    const logger = fakeSystemLogService();
    const service = new ExclusionRuleMatchService(
      [targetA, targetB] as unknown as ExclusionRuleTarget[],
      undefined,
      logger.service,
      before.fingerprints.repository
    );

    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([[2], "new"]);
    expect(onlyArgs(targetB)).toEqual(["new", "new"]);
  });

  it("rematches every ad when the stored fingerprint cannot be read", async () => {
    const { service, targetA, fingerprints, info, warn } = setup(global("drill"));
    const error = new Error("db down");
    fingerprints.getByMarketplace.mockRejectedValueOnce(error);

    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined]);
    expect(warn).toHaveBeenCalledWith(
      "ExclusionRuleMatchService",
      "Reading the exclusion rule fingerprint of amazon failed",
      { error, marketplace: "amazon" }
    );
    info.mockRestore();
  });

  it("logs a failed store and keeps the fingerprint in memory", async () => {
    const { service, targetA, fingerprints, info, error } = setup(global("drill"));
    const failure = new Error("db down");
    fingerprints.set.mockRejectedValueOnce(failure);

    await service.sync();
    await service.sync();

    expect(onlyArgs(targetA)).toEqual([undefined, "new"]);
    expect(error).toHaveBeenCalledWith(
      "ExclusionRuleMatchService",
      "Storing the exclusion rule fingerprint of amazon failed",
      { error: failure, marketplace: "amazon" }
    );
    info.mockRestore();
  });

  it("skips a run while the previous one is still running", async () => {
    const { service, targetA, info } = setup(global("drill"));
    const first = deferred<{ excluded: number; included: number; scanned: number }>();
    targetA.matchExclusionRules.mockReturnValueOnce(first.promise);

    const running = service.sync();
    await service.sync();
    await vi.waitFor(() =>
      expect(targetA.matchExclusionRules).toHaveBeenCalledTimes(1)
    );

    first.resolve({ excluded: 0, included: 0, scanned: 0 });
    await running;
    await service.sync();

    expect(targetA.matchExclusionRules).toHaveBeenCalledTimes(2);
    info.mockRestore();
  });
});
