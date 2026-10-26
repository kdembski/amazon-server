import { describe, expect, it, vi } from "vitest";
import { ActivityStatsService } from "@/modules/monitoring/services/ActivityStatsService";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";

const HOUR = 3600;
const range = { from: new Date(10 * HOUR * 1000), to: new Date(12 * HOUR * 1000) };

const setup = (current: unknown[], previous: unknown[]) => {
  const repository = {
    getSumByTypeChannelAndHour: vi
      .fn()
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(previous),
  };
  const service = new ActivityStatsService(repository as unknown as ActivityEventRepository);
  return { service, repository };
};

describe("ActivityStatsService", () => {
  it("builds hourly series of the range and totals of both periods", async () => {
    const { service, repository } = setup(
      [
        { type: "price_drop_sent", channel: null, hour: 11 * HOUR, value: 1 },
        { type: "country_outlier_sent", channel: "3", hour: 10 * HOUR, value: 2 },
        { type: "ad_scraped", channel: null, hour: 11 * HOUR, value: 7 },
        { type: "country_outlier_sent", channel: "1", hour: 11 * HOUR, value: 1 },
        { type: "ad_scraped", channel: null, hour: 10 * HOUR, value: 5 },
      ],
      [{ type: "ad_scraped", channel: null, hour: 9 * HOUR, value: 40 }]
    );

    const stats = await service.get(range);

    expect(repository.getSumByTypeChannelAndHour.mock.calls).toEqual([
      [range.from, range.to],
      [new Date(8 * HOUR * 1000), range.from],
    ]);
    expect(stats).toEqual({
      series: [
        {
          type: "ad_scraped",
          channel: null,
          points: [
            { t: "1970-01-01T10:00:00.000Z", value: 5 },
            { t: "1970-01-01T11:00:00.000Z", value: 7 },
          ],
        },
        {
          type: "country_outlier_sent",
          channel: "1",
          points: [{ t: "1970-01-01T11:00:00.000Z", value: 1 }],
        },
        {
          type: "country_outlier_sent",
          channel: "3",
          points: [{ t: "1970-01-01T10:00:00.000Z", value: 2 }],
        },
        {
          type: "price_drop_sent",
          channel: null,
          points: [{ t: "1970-01-01T11:00:00.000Z", value: 1 }],
        },
      ],
      totals: { ad_scraped: 12, country_outlier_sent: 3, price_drop_sent: 1 },
      previousTotals: { ad_scraped: 40, country_outlier_sent: 0, price_drop_sent: 0 },
    });
  });

  it("returns no series and zero totals without events", async () => {
    const { service } = setup([], []);

    expect(await service.get(range)).toEqual({
      series: [],
      totals: { ad_scraped: 0, country_outlier_sent: 0, price_drop_sent: 0 },
      previousTotals: { ad_scraped: 0, country_outlier_sent: 0, price_drop_sent: 0 },
    });
  });
});
