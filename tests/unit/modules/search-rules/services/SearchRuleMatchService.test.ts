import { describe, expect, it, vi } from "vitest";
import { SearchRuleMatchService } from "@/modules/search-rules/services/SearchRuleMatchService";
import { SearchRuleTarget } from "@/modules/search-rules/interfaces/SearchRuleTarget";
import { deferred } from "../../../../support/fakes";

type Rule = { value: string; scope: number | null };

const global = (...values: string[]): Rule[] =>
  values.map((value) => ({ value, scope: null }));

const fakeTarget = (rules: Rule[] = []) => ({
  getSearchRules: vi.fn().mockResolvedValue(rules),
  matchSearchRules: vi.fn().mockResolvedValue({ matched: 0, unmatched: 0 }),
});

const setup = (rulesA: Rule[] = [], rulesB: Rule[] = []) => {
  const targetA = fakeTarget(rulesA);
  const targetB = fakeTarget(rulesB);
  const service = new SearchRuleMatchService([
    targetA,
    targetB,
  ] as SearchRuleTarget[]);
  const info = vi.spyOn(console, "log").mockImplementation(() => {});
  return { service, targetA, targetB, info };
};

const onlyNewFlags = (target: ReturnType<typeof fakeTarget>) =>
  target.matchSearchRules.mock.calls.map((call) => call[1]);

describe("SearchRuleMatchService.sync", () => {
  it("runs every target with a matcher built from its own rules", async () => {
    const { service, targetA, targetB, info } = setup(global("drill"), [
      { value: "bose", scope: 2 },
    ]);

    await service.sync();

    const [matchesA, onlyNewA] = targetA.matchSearchRules.mock.calls[0];
    const [matchesB, onlyNewB] = targetB.matchSearchRules.mock.calls[0];
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
    targetA.matchSearchRules.mockResolvedValue({ matched: 2, unmatched: 1 });
    targetB.matchSearchRules.mockResolvedValue({ matched: 2, unmatched: 1 });

    await service.sync();

    expect(info).toHaveBeenCalledTimes(2);
    for (const [message] of info.mock.calls) {
      expect(message).toMatch(
        /^SearchRuleMatchService: 1 search rules matched 2 and unmatched 1 ads in \d+ ms$/
      );
    }
    info.mockRestore();
  });

  it("runs the targets one after another", async () => {
    const { service, targetA, targetB, info } = setup(global("drill"));
    const first = deferred<{ matched: number; unmatched: number }>();
    targetA.matchSearchRules.mockReturnValueOnce(first.promise);

    const running = service.sync();
    await vi.waitFor(() =>
      expect(targetA.matchSearchRules).toHaveBeenCalledTimes(1)
    );
    expect(targetB.matchSearchRules).not.toHaveBeenCalled();

    first.resolve({ matched: 0, unmatched: 0 });
    await running;

    expect(targetB.matchSearchRules).toHaveBeenCalledTimes(1);
    info.mockRestore();
  });

  it("skips an unparsable rule and logs it", async () => {
    const { service, targetA, info } = setup(global("drill", "a++b"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.sync();

    expect(error).toHaveBeenCalledWith(
      'SearchRuleMatchService: skipped search rule a++b: Error: Search rule "a++b" contains an empty part'
    );
    expect(targetA.matchSearchRules.mock.calls[0][0]("drill", null)).toBe(true);
    error.mockRestore();
    info.mockRestore();
  });

  it("passes onlyNew = true while the rules are unchanged, in any order", async () => {
    const { service, targetA, info } = setup();
    targetA.getSearchRules
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
    targetB.getSearchRules
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
    targetA.getSearchRules
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
    targetB.matchSearchRules.mockRejectedValueOnce(new Error("db down"));

    await expect(service.sync()).rejects.toThrow("db down");
    await service.sync();

    expect(onlyNewFlags(targetA)).toEqual([false, true]);
    expect(onlyNewFlags(targetB)).toEqual([false, false]);
    info.mockRestore();
  });

  it("skips a run while the previous one is still running", async () => {
    const { service, targetA, info } = setup(global("drill"));
    const first = deferred<{ matched: number; unmatched: number }>();
    targetA.matchSearchRules.mockReturnValueOnce(first.promise);

    const running = service.sync();
    await service.sync();
    await vi.waitFor(() =>
      expect(targetA.matchSearchRules).toHaveBeenCalledTimes(1)
    );

    first.resolve({ matched: 0, unmatched: 0 });
    await running;
    await service.sync();

    expect(targetA.matchSearchRules).toHaveBeenCalledTimes(2);
    info.mockRestore();
  });
});
