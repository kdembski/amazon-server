import { describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { SearchRuleMatchCronService } from "@/services/cron/SearchRuleMatchCronService";
import { SearchRuleMatchService } from "@/services/search-rule/SearchRuleMatchService";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const matchService = { sync: vi.fn().mockResolvedValue(undefined) };
  const service = new SearchRuleMatchCronService(
    matchService as unknown as SearchRuleMatchService
  );
  return { service, matchService };
};

describe("SearchRuleMatchCronService", () => {
  it("schedules run() every minute", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 * * * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("run() syncs the search rule matches", async () => {
    const { service, matchService } = setup();

    await service.run();

    expect(matchService.sync).toHaveBeenCalled();
  });
});
