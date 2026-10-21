import { describe, expect, it, vi } from "vitest";
import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import { deferred, fakeSystemLogService } from "../../../../support/fakes";

type Rule = { value: string; scope: number | null };

const global = (...values: string[]): Rule[] =>
  values.map((value) => ({ value, scope: null }));

const fakeTarget = (rules: Rule[] = []) => ({
  getExclusionRules: vi.fn().mockResolvedValue(rules),
  getActiveScopes: vi.fn().mockResolvedValue([1, 2]),
  matchExclusionRules: vi.fn().mockResolvedValue({ excluded: 0, included: 0 }),
});

const setup = (rulesA: Rule[] = [], rulesB: Rule[] = []) => {
  const targetA = fakeTarget(rulesA);
  const targetB = fakeTarget(rulesB);
  const logger = fakeSystemLogService();
  const service = new ExclusionRuleMatchService(
    [targetA, targetB] as ExclusionRuleTarget[],
    undefined,
    logger.service
  );
  return { service, targetA, targetB, info: logger.info, warn: logger.warn };
};

const onlyNewFlags = (target: ReturnType<typeof fakeTarget>) =>
  target.matchExclusionRules.mock.calls.map((call) => call[1]);

describe("ExclusionRuleMatchService.sync", () => {
  it("runs every target with a matcher built from its own rules", async () => {
    const { service, targetA, targetB, info } = setup(global("drill"), [
      { value: "bose", scope: 2 },
    ]);

    await service.sync();

    const [matchesA, onlyNewA] = targetA.matchExclusionRules.mock.calls[0];
    const [matchesB, onlyNewB] = targetB.matchExclusionRules.mock.calls[0];
    expect(onlyNewA).toBe(false);
    expect(onlyNewB).toBe(false);
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
    targetA.matchExclusionRules.mockResolvedValue({ excluded: 2, included: 1 });
    targetB.matchExclusionRules.mockResolvedValue({ excluded: 2, included: 1 });

    await service.sync();

    expect(info).toHaveBeenCalledTimes(2);
    for (const [source, message, context] of info.mock.calls) {
      expect(source).toBe("ExclusionRuleMatchService");
      expect(message).toBe("1 exclusion rules excluded 2 and included 1 ads");
      expect(context).toEqual({
        target: "Object",
        rules: 1,
        activeScopes: [1, 2],
        excluded: 2,
        included: 1,
        durationMs: expect.any(Number),
      });
    }
    info.mockRestore();
  });

  it("runs the targets one after another", async () => {
    const { service, targetA, targetB, info } = setup(global("drill"));
    const first = deferred<{ excluded: number; included: number }>();
    targetA.matchExclusionRules.mockReturnValueOnce(first.promise);

    const running = service.sync();
    await vi.waitFor(() =>
      expect(targetA.matchExclusionRules).toHaveBeenCalledTimes(1)
    );
    expect(targetB.matchExclusionRules).not.toHaveBeenCalled();

    first.resolve({ excluded: 0, included: 0 });
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

  it("rematches when the active scopes change, not when only their order does", async () => {
    const { service, targetA, info } = setup();
    targetA.getActiveScopes
      .mockResolvedValueOnce([1, 2])
      .mockResolvedValueOnce([2, 1])
      .mockResolvedValueOnce([2]);

    await service.sync();
    await service.sync();
    await service.sync();

    expect(onlyNewFlags(targetA)).toEqual([false, true, false]);
    info.mockRestore();
  });

  it("passes onlyNew = true while the rules are unchanged, in any order", async () => {
    const { service, targetA, info } = setup();
    targetA.getExclusionRules
      .mockResolvedValueOnce(global("sony", "bose"))
      .mockResolvedValueOnce(global("bose", "sony"));

    await service.sync();
    info.mockClear();
    await service.sync();

    expect(onlyNewFlags(targetA)).toEqual([false, true]);
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

    expect(onlyNewFlags(targetA)).toEqual([false, true]);
    expect(onlyNewFlags(targetB)).toEqual([false, false]);
    info.mockRestore();
  });

  it("rematches when only the scope of a rule changed", async () => {
    const { service, targetA, info } = setup();
    targetA.getExclusionRules
      .mockResolvedValueOnce([{ value: "drill", scope: null }])
      .mockResolvedValueOnce([{ value: "drill", scope: 1 }]);

    await service.sync();
    await service.sync();

    expect(onlyNewFlags(targetA)).toEqual([false, false]);
    info.mockRestore();
  });

  it("keeps the old fingerprint when a target throws, so the next run rematches it", async () => {
    const { service, targetA, targetB, info } = setup(
      global("drill"),
      global("drill")
    );
    targetB.matchExclusionRules.mockRejectedValueOnce(new Error("db down"));

    await expect(service.sync()).rejects.toThrow("db down");
    await service.sync();

    expect(onlyNewFlags(targetA)).toEqual([false, true]);
    expect(onlyNewFlags(targetB)).toEqual([false, false]);
    info.mockRestore();
  });

  it("skips a run while the previous one is still running", async () => {
    const { service, targetA, info } = setup(global("drill"));
    const first = deferred<{ excluded: number; included: number }>();
    targetA.matchExclusionRules.mockReturnValueOnce(first.promise);

    const running = service.sync();
    await service.sync();
    await vi.waitFor(() =>
      expect(targetA.matchExclusionRules).toHaveBeenCalledTimes(1)
    );

    first.resolve({ excluded: 0, included: 0 });
    await running;
    await service.sync();

    expect(targetA.matchExclusionRules).toHaveBeenCalledTimes(2);
    info.mockRestore();
  });
});
