import { describe, expect, it, vi } from "vitest";
import { SearchRuleMatchService } from "@/services/search-rule/SearchRuleMatchService";
import { SearchRuleService } from "@/services/search-rule/SearchRuleService";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { buildSearchRule } from "../../../support/factories";
import { deferred } from "../../../support/fakes";

const setup = () => {
  const searchRuleService = { getAll: vi.fn().mockResolvedValue([]) };
  const adRepository = {
    matchSearchRules: vi.fn().mockResolvedValue({ matched: 0, unmatched: 0 }),
  };
  const service = new SearchRuleMatchService(
    searchRuleService as unknown as SearchRuleService,
    adRepository as unknown as AmazonAdRepository
  );
  const info = vi.spyOn(console, "log").mockImplementation(() => {});
  return { service, searchRuleService, adRepository, info };
};

describe("SearchRuleMatchService.sync", () => {
  it("rematches every ad on the first run and logs the result", async () => {
    const { service, searchRuleService, adRepository, info } = setup();
    const rules = [buildSearchRule({ value: "sony" })];
    searchRuleService.getAll.mockResolvedValue(rules);
    adRepository.matchSearchRules.mockResolvedValue({ matched: 3, unmatched: 5 });

    await service.sync();

    expect(adRepository.matchSearchRules).toHaveBeenCalledWith(rules, false);
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(
        /^SearchRuleMatchService: 1 search rules matched 3 and unmatched 5 ads in \d+ ms$/
      )
    );
    info.mockRestore();
  });

  it("matches only new ads while the rules stay the same, in any order", async () => {
    const { service, searchRuleService, adRepository, info } = setup();
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

    expect(adRepository.matchSearchRules).toHaveBeenLastCalledWith(
      expect.any(Array),
      true
    );
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("rematches every ad again after a rule changes", async () => {
    const { service, searchRuleService, adRepository, info } = setup();
    searchRuleService.getAll
      .mockResolvedValueOnce([buildSearchRule({ value: "sony" })])
      .mockResolvedValueOnce([buildSearchRule({ value: "sony+!used" })]);

    await service.sync();
    await service.sync();

    expect(adRepository.matchSearchRules.mock.calls.map((call) => call[1])).toEqual([
      false,
      false,
    ]);
    info.mockRestore();
  });

  it("retries the full rematch when it failed", async () => {
    const { service, adRepository, info } = setup();
    adRepository.matchSearchRules.mockRejectedValueOnce(new Error("db down"));

    await expect(service.sync()).rejects.toThrow("db down");
    await service.sync();

    expect(adRepository.matchSearchRules.mock.calls.map((call) => call[1])).toEqual([
      false,
      false,
    ]);
    info.mockRestore();
  });

  it("skips a run while the previous one is still in progress", async () => {
    const { service, adRepository, info } = setup();
    const first = deferred<{ matched: number; unmatched: number }>();
    adRepository.matchSearchRules.mockReturnValueOnce(first.promise);

    const running = service.sync();
    await service.sync();
    await vi.waitFor(() => expect(adRepository.matchSearchRules).toHaveBeenCalledTimes(1));

    first.resolve({ matched: 0, unmatched: 0 });
    await running;
    await service.sync();

    expect(adRepository.matchSearchRules).toHaveBeenCalledTimes(2);
    info.mockRestore();
  });
});
