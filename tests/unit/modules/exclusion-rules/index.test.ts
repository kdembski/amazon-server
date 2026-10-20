import { describe, expect, it, vi } from "vitest";
import { createExclusionRulesModule } from "@/modules/exclusion-rules";
import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { ExclusionRuleMatchCronService } from "@/modules/exclusion-rules/cron/ExclusionRuleMatchCronService";
import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";

vi.mock("@/modules/exclusion-rules/services/ExclusionRuleMatchService", () => ({
  ExclusionRuleMatchService: vi.fn(function () {
    return { sync: vi.fn() };
  }),
}));
vi.mock("@/modules/exclusion-rules/cron/ExclusionRuleMatchCronService", () => ({
  ExclusionRuleMatchCronService: vi.fn(function () {
    return { schedule: vi.fn() };
  }),
}));

describe("createExclusionRulesModule", () => {
  it("runs the given targets from one match cron", () => {
    const targets = [
      { getExclusionRules: vi.fn(), matchExclusionRules: vi.fn() },
    ] as ExclusionRuleTarget[];

    const module = createExclusionRulesModule(targets);

    expect(ExclusionRuleMatchService).toHaveBeenCalledWith(targets);
    const matchService = vi.mocked(ExclusionRuleMatchService).mock.results[0].value;
    expect(ExclusionRuleMatchCronService).toHaveBeenCalledWith(matchService);
    expect(module.crons).toEqual([
      vi.mocked(ExclusionRuleMatchCronService).mock.results[0].value,
    ]);
    expect(module.routers).toBeUndefined();
  });
});
