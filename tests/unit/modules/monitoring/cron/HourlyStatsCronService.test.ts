import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import {
  fakeActivityCountService,
  fakeActivityEventService,
  fakeScraperMetricService,
  unitLogger,
} from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const COUNTS: [string, string?][] = [
  ["ad_scraped"],
  ["country_outlier_sent", "1"],
  ["country_outlier_sent", "2"],
  ["country_outlier_sent", "3"],
  ["country_outlier_sent", "4"],
  ["country_outlier_sent", "5"],
  ["country_outlier_sent", "6"],
  ["price_drop_sent"],
];

const setup = () => {
  const sendHourly = vi.fn();
  const log = fakeActivityEventService();
  const counter = fakeActivityCountService();
  const metrics = fakeScraperMetricService();
  const service = new HourlyStatsCronService(
    { sendHourly } as unknown as DiscordLogService,
    log.service,
    metrics.service,
    undefined,
    counter.service
  );
  return { service, sendHourly, log, counter, metrics };
};

describe("HourlyStatsCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
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
    expect(unitLogger().error).toHaveBeenCalledWith("HourlyStatsCronService", "Cron run failed", {
      error,
    });
  });

  it("schedules run() every full hour", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 00 */1 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("counts every event type and conversion channel over the last hour and sends them in order", async () => {
    const { service, sendHourly, log, counter } = setup();
    log.getCount.mockImplementation(
      (type: string, _from: Date, _to: Date, channel?: string) =>
        Promise.resolve(
          COUNTS.findIndex(([t, c]) => t === type && c === channel) * 10
        )
    );
    counter.getCountWithMinPrices.mockResolvedValue(80);

    await service.run();

    const from = new Date("2026-06-01T09:00:00Z");
    const to = new Date("2026-06-01T10:00:00Z");
    expect(counter.getCount).toHaveBeenCalledWith("ad_scraped", from, to);
    expect(counter.getCountWithMinPrices).toHaveBeenCalledWith("ad_scraped", 4, from, to);
    COUNTS.slice(1).forEach(([type, channel]) =>
      expect(log.getCount).toHaveBeenCalledWith(type, from, to, channel)
    );
    expect(sendHourly).toHaveBeenCalledWith(
      [0, 10, 20, 30, 40, 50, 60, 70, 80],
      []
    );
  });

  it("passes the scraper summaries of the hour ending 90 s before the full hour as the second argument", async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 11, 0, 0, 50));
    const { service, sendHourly, metrics } = setup();
    const summaries = [{ scraper: "amazon-pdp" }];
    metrics.getSummaries.mockResolvedValue(summaries);

    await service.run();

    expect(metrics.getSummaries).toHaveBeenCalledWith(
      new Date(2026, 5, 1, 9, 58, 30, 0),
      new Date(2026, 5, 1, 10, 58, 30, 0)
    );
    expect(sendHourly).toHaveBeenCalledWith(expect.any(Array), summaries);
  });

  it("uses the same summaries window when the clock is not exactly on the hour", async () => {
    vi.setSystemTime(new Date(2026, 5, 1, 11, 0, 7, 0));
    const { service, metrics } = setup();

    await service.run();

    expect(metrics.getSummaries).toHaveBeenCalledWith(
      new Date(2026, 5, 1, 9, 58, 30, 0),
      new Date(2026, 5, 1, 10, 58, 30, 0)
    );
  });

  it("still sends the hourly report with empty summaries when getSummaries rejects", async () => {
    const { service, sendHourly, log, counter, metrics } = setup();
    log.getCount.mockResolvedValue(4);
    counter.getCount.mockResolvedValue(4);
    counter.getCountWithMinPrices.mockResolvedValue(4);
    const error = new Error("db down");
    metrics.getSummaries.mockRejectedValue(error);

    await service.run();

    expect(unitLogger().error).toHaveBeenCalledWith(
      "HourlyStatsCronService",
      "Scraper metric summaries failed, sending the report without them",
      {
        error,
        from: metrics.getSummaries.mock.calls[0][0],
        to: metrics.getSummaries.mock.calls[0][1],
      }
    );
    expect(sendHourly).toHaveBeenCalledWith(Array(9).fill(4), []);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "HourlyStatsCronService",
      "Hourly report sent",
      { counts: Array(9).fill(4), scrapers: 0 }
    );
  });
});
