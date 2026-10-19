import { Marketplace } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";

const setup = () => {
  const repository = {
    createMany: vi.fn().mockResolvedValue(2),
    deleteOlderThan: vi.fn().mockResolvedValue(7),
    sumByScraper: vi.fn().mockResolvedValue([]),
  };
  const mapper = {
    toCreateInputs: vi.fn().mockReturnValue([{ a: 1 }, { a: 2 }]),
  };
  return {
    repository,
    mapper,
    service: new ScraperMetricService(
      repository as unknown as ScraperMetricRepository,
      mapper as unknown as ScraperMetricCreateMapper
    ),
  };
};

const dto = (metrics: { metric: string; value: number }[]) => ({
  marketplace: "amazon" as Marketplace,
  flow: "pdp",
  periodStart: "2026-10-18T10:00:00.000Z",
  metrics,
});

describe("ScraperMetricService", () => {
  it("add maps the dto and returns the stored count", async () => {
    const { service, repository, mapper } = setup();
    const body = dto([{ metric: "requests", value: 1 }]);

    expect(await service.add("amazon-pdp", body)).toBe(2);

    expect(mapper.toCreateInputs).toHaveBeenCalledWith("amazon-pdp", body);
    expect(repository.createMany).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }]);
  });

  it("add returns 0 without touching the repository when there are no metrics", async () => {
    const { service, repository, mapper } = setup();
    mapper.toCreateInputs.mockReturnValue([]);

    expect(await service.add("amazon-pdp", dto([]))).toBe(0);

    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it("deleteOlderThan delegates to the repository", async () => {
    const { service, repository } = setup();
    const date = new Date(5);

    expect(await service.deleteOlderThan(date)).toBe(7);

    expect(repository.deleteOlderThan).toHaveBeenCalledWith(date);
  });

  describe("getSummaries", () => {
    const from = new Date("2026-10-18T10:00:00Z");
    const to = new Date("2026-10-18T11:00:00Z");
    const previous = new Date("2026-10-18T09:00:00Z");

    type Sum = {
      scraper: string;
      metric: string;
      outcome: string | null;
      value: number;
    };
    const sum = (
      metric: string,
      outcome: string | null,
      value: number,
      scraper = "amazon-pdp"
    ): Sum => ({ scraper, metric, outcome, value });

    const currentSums = (scraper = "amazon-pdp") => [
      sum("requests", "ok", 900, scraper),
      sum("requests", "timeout", 50, scraper),
      sum("requests", "http_404", 30, scraper),
      sum("requests", "http_503", 20, scraper),
      sum("responses", "data", 800, scraper),
      sum("responses", "no_data", 50, scraper),
      sum("responses", "captcha", 40, scraper),
      sum("responses", "invalid", 10, scraper),
      sum("connections", null, 200, scraper),
      sum("bytes_in", null, 20_480_000, scraper),
      sum("bytes_out", null, 1_024_000, scraper),
      sum("items", "data", 800, scraper),
      sum("items", "no_data", 50, scraper),
      sum("items", "deleted", 10, scraper),
      sum("items", "given_up", 5, scraper),
      sum("item_attempts", "data", 900, scraper),
      sum("item_attempts", "no_data", 60, scraper),
      sum("item_attempts", "deleted", 10, scraper),
      sum("item_attempts", "given_up", 75, scraper),
    ];

    const arrange = (current: Sum[], earlier: Sum[]) => {
      const ctx = setup();
      ctx.repository.sumByScraper.mockImplementation(async (f: Date) =>
        f.getTime() === from.getTime() ? current : earlier
      );
      return ctx;
    };

    it("computes the KPIs of the window against the previous window", async () => {
      const { service, repository } = arrange(currentSums(), [
        sum("items", "data", 720),
      ]);

      const result = await service.getSummaries(from, to);

      expect(repository.sumByScraper).toHaveBeenCalledWith(from, to);
      expect(repository.sumByScraper).toHaveBeenCalledWith(previous, from);
      expect(result).toHaveLength(1);
      const summary = result[0];
      expect(summary.scraper).toBe("amazon-pdp");
      expect(summary.itemsPerSecond).toBeCloseTo(860 / 3600);
      expect(summary.itemsPerSecondDiff).toBeCloseTo(140 / 3600);
      expect(summary.requests).toBe(1000);
      expect(summary.wastedPercent).toBeCloseTo(12);
      expect(summary.captchaPercent).toBeCloseTo(4);
      expect(summary.kbPerItem).toBeCloseTo(26.25);
      expect(summary.reusePercent).toBeCloseTo(80);
      expect(summary.attemptsPerItem).toBeCloseTo(1045 / 865);
    });

    it("uses the whole speed as the diff when the scraper was missing in the previous window", async () => {
      const { service } = arrange(currentSums(), []);

      const [summary] = await service.getSummaries(from, to);

      expect(summary.itemsPerSecondDiff).toBeCloseTo(summary.itemsPerSecond);
    });

    it("omits scrapers that only exist in the previous window", async () => {
      const { service } = arrange([], [sum("items", "data", 720)]);

      expect(await service.getSummaries(from, to)).toEqual([]);
    });

    it("zeroes the ratios and nulls the per-item values when only connections exist", async () => {
      const { service } = arrange([sum("connections", null, 5)], []);

      const [summary] = await service.getSummaries(from, to);

      expect(summary).toEqual({
        scraper: "amazon-pdp",
        itemsPerSecond: 0,
        itemsPerSecondDiff: 0,
        requests: 0,
        wastedPercent: 0,
        captchaPercent: 0,
        kbPerItem: null,
        reusePercent: 0,
        attemptsPerItem: null,
      });
    });

    it("clamps reuse at 0 when connections exceed requests", async () => {
      const { service } = arrange(
        [sum("requests", "ok", 10), sum("connections", null, 20)],
        []
      );

      const [summary] = await service.getSummaries(from, to);

      expect(summary.reusePercent).toBe(0);
    });

    it("sorts the summaries by scraper", async () => {
      const { service } = arrange(
        [...currentSums("amazon-plp"), ...currentSums("amazon-pdp")],
        []
      );

      const result = await service.getSummaries(from, to);

      expect(result.map((s) => s.scraper)).toEqual(["amazon-pdp", "amazon-plp"]);
    });
  });
});
