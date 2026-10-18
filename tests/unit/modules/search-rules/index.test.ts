import { describe, expect, it, vi } from "vitest";
import { createSearchRulesModule } from "@/modules/search-rules";
import { SearchRuleMatchService } from "@/modules/search-rules/services/SearchRuleMatchService";
import { SearchRuleMatchCronService } from "@/modules/search-rules/cron/SearchRuleMatchCronService";
import { SearchRuleTarget } from "@/modules/search-rules/interfaces/SearchRuleTarget";

vi.mock("@/modules/search-rules/services/SearchRuleMatchService", () => ({
  SearchRuleMatchService: vi.fn(function () {
    return { sync: vi.fn() };
  }),
}));
vi.mock("@/modules/search-rules/cron/SearchRuleMatchCronService", () => ({
  SearchRuleMatchCronService: vi.fn(function () {
    return { schedule: vi.fn() };
  }),
}));

describe("createSearchRulesModule", () => {
  it("runs the given targets from one match cron", () => {
    const targets = [{ matchSearchRules: vi.fn() }] as SearchRuleTarget[];

    const module = createSearchRulesModule(targets);

    expect(SearchRuleMatchService).toHaveBeenCalledWith(targets);
    const matchService = vi.mocked(SearchRuleMatchService).mock.results[0].value;
    expect(SearchRuleMatchCronService).toHaveBeenCalledWith(matchService);
    expect(module.crons).toEqual([
      vi.mocked(SearchRuleMatchCronService).mock.results[0].value,
    ]);
    expect(module.routers).toBeUndefined();
  });
});
