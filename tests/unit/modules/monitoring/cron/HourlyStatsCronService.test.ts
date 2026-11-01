import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import {
  fakeActivityCountService,
  fakeBusinessLogService,
  fakeScraperMetricService,
  fakeSettingService,
  unitLogger,
} from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const CHANNELS = [
  { id: 1, name: "outlier-50", token: "1/a", createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: "outlier-90", token: "2/b", createdAt: new Date(), updatedAt: new Date() },
  { id: 7, name: "hist", token: "7/c", createdAt: new Date(), updatedAt: new Date() },
];
const RULE_GROUPS = [
  [
    { channelId: 2, belowMedianPercent: 90 },
    { channelId: 1, belowMedianPercent: 50 },
  ],
  [{ channelId: 2, belowMedianPercent: 70, maxPln: 50 }, { channelId: 9, belowMedianPercent: 70 }],
];

const setup = () => {
  const sendHourly = vi.fn();
  const log = fakeBusinessLogService();
  const counter = fakeActivityCountService();
  const metrics = fakeScraperMetricService();
  const service = new HourlyStatsCronService(
    { sendHourly } as unknown as DiscordLogService,
    log.service,
    metrics.service,
    undefined,
    counter.service,
    fakeSettingService(
      { "countryOutlier.ruleGroups": RULE_GROUPS, "countryOutlier.minPrices": 4 },
      CHANNELS
    ).service
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

  it("counts the events of every channel of the rule groups over the last hour", async () => {
    const { service, sendHourly, log, counter } = setup();
    log.getCount.mockImplementation((type: string, _from: Date, _to: Date, channel?: string) => {
      return Promise.resolve(type === "price_drop_sent" ? 70 : Number(channel) * 10);
    });
    counter.getCount.mockResolvedValue(5);
    counter.getCountWithMinPrices.mockResolvedValue(80);

    await service.run();

    const from = new Date("2026-06-01T09:00:00Z");
    const to = new Date("2026-06-01T10:00:00Z");
    expect(counter.getCount).toHaveBeenCalledWith("ad_scraped", from, to);
    expect(counter.getCountWithMinPrices).toHaveBeenCalledWith("ad_scraped", 4, from, to);
    expect(log.getCount).toHaveBeenCalledWith("price_drop_sent", from, to, undefined);
    expect(sendHourly).toHaveBeenCalledWith(
      {
        scraped: 5,
        comparable: 80,
        minPrices: 4,
        priceDrop: { name: "hist", count: 70 },
        channels: [
          { name: "outlier-90", count: 20 },
          { name: "outlier-50", count: 10 },
          { name: "#9", count: 90 },
        ],
      },
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
    expect(sendHourly).toHaveBeenCalledWith(expect.any(Object), summaries);
  });

  it("names the price drop count after an unknown channel by its id", async () => {
    const sendHourly = vi.fn();
    const service = new HourlyStatsCronService(
      { sendHourly } as unknown as DiscordLogService,
      fakeBusinessLogService().service,
      fakeScraperMetricService().service,
      undefined,
      fakeActivityCountService().service,
      fakeSettingService({ "priceDrop.channelId": 12 }).service
    );

    await service.run();

    expect(sendHourly.mock.calls[0][0].priceDrop).toEqual({ name: "#12", count: 0 });
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
    const counts = {
      scraped: 4,
      comparable: 4,
      minPrices: 4,
      priceDrop: { name: "hist", count: 4 },
      channels: [
        { name: "outlier-90", count: 4 },
        { name: "outlier-50", count: 4 },
        { name: "#9", count: 4 },
      ],
    };
    expect(sendHourly).toHaveBeenCalledWith(counts, []);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "HourlyStatsCronService",
      "Hourly report sent",
      { counts, scrapers: 0 }
    );
  });
});
