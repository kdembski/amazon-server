import { describe, expect, it, vi } from "vitest";
import { SearchRuleMatchService } from "@/modules/search-rules/services/SearchRuleMatchService";
import { SearchRuleService } from "@/modules/search-rules/services/SearchRuleService";
import { SearchRuleTarget } from "@/modules/search-rules/interfaces/SearchRuleTarget";
import { buildSearchRule } from "../../../../support/factories";
import { deferred } from "../../../../support/fakes";

const fakeTarget = (result = { matched: 0, unmatched: 0 }) => ({
  matchSearchRules: vi.fn().mockResolvedValue(result),
});

const setup = (rules: string[] = []) => {
  const searchRuleService = {
    getAll: vi
      .fn()
      .mockResolvedValue(rules.map((value) => buildSearchRule({ value }))),
  };
  const targetA = fakeTarget();
  const targetB = fakeTarget();
  const service = new SearchRuleMatchService(
    [targetA, targetB] as SearchRuleTarget[],
    searchRuleService as unknown as SearchRuleService
  );
  const info = vi.spyOn(console, "log").mockImplementation(() => {});
  return { service, searchRuleService, targetA, targetB, info };
};

describe("SearchRuleMatchService.sync", () => {
  it("builds one matcher and runs every target with it, summing the counts", async () => {
    const { service, targetA, targetB, info } = setup(["drill"]);
    targetA.matchSearchRules.mockResolvedValue({ matched: 2, unmatched: 1 });
    targetB.matchSearchRules.mockResolvedValue({ matched: 1, unmatched: 0 });

    await service.sync();

    const [matchesA, onlyNewA] = targetA.matchSearchRules.mock.calls[0];
    const [matchesB, onlyNewB] = targetB.matchSearchRules.mock.calls[0];
    expect(matchesA).toBe(matchesB);
    expect(onlyNewA).toBe(false);
    expect(onlyNewB).toBe(false);
    expect(matchesA("Bosch drill")).toBe(true);
    expect(matchesA("Hammer")).toBe(false);
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(
        /^SearchRuleMatchService: 1 search rules matched 3 and unmatched 1 ads in \d+ ms$/
      )
    );
    info.mockRestore();
  });

  it("runs the targets one after another", async () => {
    const { service, targetA, targetB, info } = setup(["drill"]);
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
    const { service, targetA, info } = setup(["drill", "a++b"]);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await service.sync();

    expect(error).toHaveBeenCalledWith(
      "SearchRuleMatchService: skipped search rule a++b: Error: Zasada **a++b** zawiera pusty fragment"
    );
    expect(targetA.matchSearchRules.mock.calls[0][0]("drill")).toBe(true);
    error.mockRestore();
    info.mockRestore();
  });

  it("passes onlyNew = true while the rules are unchanged, in any order", async () => {
    const { service, searchRuleService, targetA, targetB, info } = setup();
    searchRuleService.getAll
      .mockResolvedValueOnce([
        buildSearchRule({ value: "sony" }),
        buildSearchRule({ value: "bose" }),
      ])
      .mockResolvedValueOnce([
        buildSearchRule({ value: "bose" }),
        buildSearchRule({ value: "sony" }),
      ]);

    await service.sync();
    info.mockClear();
    await service.sync();

    expect(targetA.matchSearchRules.mock.calls.map((call) => call[1])).toEqual([
      false,
      true,
    ]);
    expect(targetB.matchSearchRules.mock.calls.map((call) => call[1])).toEqual([
      false,
      true,
    ]);
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("rematches every ad again after a rule changes", async () => {
    const { service, searchRuleService, targetA, info } = setup();
    searchRuleService.getAll
      .mockResolvedValueOnce([buildSearchRule({ value: "sony" })])
      .mockResolvedValueOnce([buildSearchRule({ value: "sony+!used" })]);

    await service.sync();
    await service.sync();

    expect(targetA.matchSearchRules.mock.calls.map((call) => call[1])).toEqual([
      false,
      false,
    ]);
    info.mockRestore();
  });

  it("keeps the old fingerprint when a target throws, so the next run rematches everything", async () => {
    const { service, targetA, targetB, info } = setup(["drill"]);
    targetB.matchSearchRules.mockRejectedValueOnce(new Error("db down"));

    await expect(service.sync()).rejects.toThrow("db down");
    await service.sync();

    expect(targetA.matchSearchRules.mock.calls.map((call) => call[1])).toEqual([
      false,
      false,
    ]);
    expect(targetB.matchSearchRules.mock.calls.map((call) => call[1])).toEqual([
      false,
      false,
    ]);
    info.mockRestore();
  });

  it("skips a run while the previous one is still running", async () => {
    const { service, targetA, info } = setup(["drill"]);
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
