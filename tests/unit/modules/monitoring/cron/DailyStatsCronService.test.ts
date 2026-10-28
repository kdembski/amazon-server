import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { fakeActivityCountService, unitLogger } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const sendDaily = vi.fn();
  const field1 = { name: "First", value: "1" };
  const field2 = { name: "Second", value: "2" };
  const getField1 = vi.fn().mockResolvedValue(field1);
  const getField2 = vi.fn().mockResolvedValue(field2);
  const log = fakeActivityCountService();
  const service = new DailyStatsCronService(
    [{ getField: getField1 }, { getField: getField2 }] as DailyReportSection[],
    { sendDaily } as unknown as DiscordLogService,
    log.service
  );
  return { service, sendDaily, getField1, getField2, field1, field2, log };
};

describe("DailyStatsCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T20:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("logs a failed run", async () => {
    const { service } = setup();
    const error = new Error("boom");
    vi.spyOn(service, "run").mockRejectedValue(error);

    service.schedule();

    const [, callback] = vi.mocked(CronJob).mock.calls[0] as unknown as [
      string,
      () => Promise<void>,
    ];
    await callback();
    expect(unitLogger().error).toHaveBeenCalledWith("DailyStatsCronService", "Cron run failed", {
      error,
    });
  });

  it("schedules run() daily at 20:00", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 00 20 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("collects every section field for the last 24h and sends them with the scraped count", async () => {
    const { service, sendDaily, getField1, getField2, field1, field2, log } =
      setup();
    const dayBefore = new Date("2026-06-01T20:00:00Z");
    const now = new Date("2026-06-02T20:00:00Z");
    log.getCount.mockResolvedValue(777);
    log.getCountWithMinPrices.mockResolvedValue(55);

    await service.run();

    expect(getField1).toHaveBeenCalledWith(dayBefore, now);
    expect(getField2).toHaveBeenCalledWith(dayBefore, now);
    expect(log.getCount).toHaveBeenCalledWith("ad_scraped", dayBefore, now);
    expect(log.getCountWithMinPrices).toHaveBeenCalledWith("ad_scraped", 4, dayBefore, now);
    expect(sendDaily).toHaveBeenCalledWith([field1, field2], 777, 55);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "DailyStatsCronService",
      "Daily report sent",
      { scraped: 777, comparable: 55, sections: ["First", "Second"] }
    );
  });
});
