import { describe, expect, it, vi } from "vitest";
import { ActivityStatsService } from "@/modules/monitoring/services/ActivityStatsService";
import { BusinessLogRepository } from "@/modules/monitoring/repositories/BusinessLogRepository";
import { fakeActivityCountService, fakeSettingService } from "../../../../support/fakes";

const HOUR = 3600;
const range = { from: new Date(10 * HOUR * 1000), to: new Date(12 * HOUR * 1000) };

const setup = (current: unknown[], previous: unknown[], withSettings = true) => {
  const repository = {
    getSumByTypeChannelAndHour: vi
      .fn()
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(previous),
  };
  const counter = fakeActivityCountService();
  counter.getCountWithMinPrices.mockResolvedValueOnce(9).mockResolvedValueOnce(30);
  const values = withSettings
    ? { "countryOutlier.minPrices": 4 }
    : { "countryOutlier.minPrices": undefined, "countryOutlier.ruleGroups": undefined };
  const settings = fakeSettingService(values, [
    { id: 1, name: "outliers-de", token: "t", createdAt: new Date(0), updatedAt: new Date(0) },
  ]);
  const service = new ActivityStatsService(
    repository as unknown as BusinessLogRepository,
    counter.service,
    settings.service
  );
  return { service, repository, counter };
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
      totals: { ad_scraped: 12, country_outlier_sent: 3, price_drop_sent: 1, ad_created: 0, ad_deleted: 0 },
      previousTotals: { ad_scraped: 40, country_outlier_sent: 0, price_drop_sent: 0, ad_created: 0, ad_deleted: 0 },
      comparable: { minPrices: 4, total: 9, previousTotal: 30 },
      countryOutlierChannels: [
        { id: "3", name: "#3" },
        { id: "2", name: "#2" },
        { id: "1", name: "outliers-de" },
        { id: "4", name: "#4" },
        { id: "5", name: "#5" },
        { id: "6", name: "#6" },
      ],
    });
  });

  it("counts the comparable ads of both periods with the minPrices setting", async () => {
    const { service, counter } = setup([], []);

    await service.get(range);

    expect(counter.getCountWithMinPrices.mock.calls).toEqual([
      ["ad_scraped", 4, range.from, range.to],
      ["ad_scraped", 4, new Date(8 * HOUR * 1000), range.from],
    ]);
  });

  it("returns no series, zero totals, no comparable count and no channels without events and settings", async () => {
    const { service, counter } = setup([], [], false);

    expect(await service.get(range)).toEqual({
      series: [],
      totals: { ad_scraped: 0, country_outlier_sent: 0, price_drop_sent: 0, ad_created: 0, ad_deleted: 0 },
      previousTotals: { ad_scraped: 0, country_outlier_sent: 0, price_drop_sent: 0, ad_created: 0, ad_deleted: 0 },
      comparable: undefined,
      countryOutlierChannels: [],
    });
    expect(counter.getCountWithMinPrices).not.toHaveBeenCalled();
  });
});
