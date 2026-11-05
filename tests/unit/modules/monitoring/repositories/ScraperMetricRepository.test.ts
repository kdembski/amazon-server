import { describe, expect, it } from "vitest";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { fakePrisma } from "../../../../support/fakes";

describe("ScraperMetricRepository", () => {
  it("createMany delegates to prisma and returns the count", async () => {
    const db = fakePrisma();
    db.scraperMetric.createMany.mockResolvedValue({ count: 2 });
    const repository = new ScraperMetricRepository(db.prisma);
    const data = [
      {
        scraper: "amazon-pdp",
        marketplace: "amazon" as const,
        flow: "pdp",
        metric: "requests",
        value: 1,
        periodStart: new Date(0),
        createdAt: new Date(1),
      },
    ];

    expect(await repository.createMany(data)).toBe(2);

    expect(db.scraperMetric.createMany).toHaveBeenCalledWith({ data });
  });

  it("deletes metrics older than a date in batches until a batch comes back short", async () => {
    const db = fakePrisma();
    const repository = new ScraperMetricRepository(db.prisma);
    db.$executeRaw
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const date = new Date(5);

    expect(await repository.deleteOlderThan(date, 2)).toBe(5);

    expect(db.$executeRaw).toHaveBeenCalledTimes(3);
    const [strings, ...values] = db.$executeRaw.mock.calls[0];
    expect(strings.join("?")).toBe(
      "DELETE FROM ScraperMetric WHERE periodStart < ? LIMIT ?"
    );
    expect(values).toEqual([date, 2]);
    expect(db.scraperMetricHourly.deleteMany).toHaveBeenCalledWith({
      where: { periodStart: { lt: date } },
    });
  });

  it("sums the hourly table when asked to", async () => {
    const db = fakePrisma();
    db.scraperMetricHourly.groupBy.mockResolvedValue([]);
    const repository = new ScraperMetricRepository(db.prisma);

    await repository.sumByScraper(new Date(0), new Date(10), true);
    await repository.sumByScraperAnd("flow", new Date(0), new Date(10), true);
    await repository.getSumByScraperAndHour(new Date(0), new Date(10), true);

    expect(db.scraperMetricHourly.groupBy).toHaveBeenCalledTimes(2);
    expect(db.scraperMetric.groupBy).not.toHaveBeenCalled();
    expect(db.$queryRaw.mock.calls[0].slice(1)).toContainEqual(
      expect.objectContaining({ strings: ["ScraperMetricHourly"] })
    );
  });

  it.each([
    [new Date(3_600_000), new Date(7_200_000)],
    [null, null],
  ])("getRolledUpUntil returns the end of the newest rolled-up hour (%s)", async (max, until) => {
    const db = fakePrisma();
    db.scraperMetricHourly.aggregate.mockResolvedValue({ _max: { periodStart: max } });
    const repository = new ScraperMetricRepository(db.prisma);

    expect(await repository.getRolledUpUntil()).toEqual(until);
  });

  it("getOldestPeriodStart returns the oldest raw periodStart", async () => {
    const db = fakePrisma();
    const oldest = new Date(5);
    db.scraperMetric.aggregate.mockResolvedValue({ _min: { periodStart: oldest } });
    const repository = new ScraperMetricRepository(db.prisma);

    expect(await repository.getOldestPeriodStart()).toBe(oldest);
  });

  it("rollUpHour replaces the sums of the hour in one transaction", async () => {
    const db = fakePrisma();
    db.scraperMetricHourly.deleteMany.mockResolvedValue({ count: 0 });
    db.$executeRaw.mockResolvedValue(4);
    const repository = new ScraperMetricRepository(db.prisma);
    const hour = new Date(3_600_000);

    expect(await repository.rollUpHour(hour)).toBe(4);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.scraperMetricHourly.deleteMany).toHaveBeenCalledWith({ where: { periodStart: hour } });
    const [strings, ...values] = db.$executeRaw.mock.calls[0];
    expect(strings.join("?")).toContain("INSERT INTO ScraperMetricHourly");
    expect(values.slice(0, 3)).toEqual([hour, hour, new Date(7_200_000)]);
  });

  it("sumByScraper groups the KPI metrics in the window and maps null sums to 0", async () => {
    const db = fakePrisma();
    db.scraperMetric.groupBy.mockResolvedValue([
      { scraper: "amazon-pdp", metric: "requests", outcome: "ok", _sum: { value: 5 } },
      { scraper: "amazon-pdp", metric: "connections", outcome: null, _sum: { value: null } },
    ]);
    const repository = new ScraperMetricRepository(db.prisma);
    const from = new Date(0);
    const to = new Date(10);

    expect(await repository.sumByScraper(from, to)).toEqual([
      { scraper: "amazon-pdp", metric: "requests", outcome: "ok", value: 5 },
      { scraper: "amazon-pdp", metric: "connections", outcome: null, value: 0 },
    ]);

    expect(db.scraperMetric.groupBy).toHaveBeenCalledWith({
      by: ["scraper", "metric", "outcome"],
      where: {
        periodStart: { gte: from, lt: to },
        metric: {
          in: [
            "requests",
            "responses",
            "items",
            "item_attempts",
            "connections",
            "bytes_in",
            "bytes_out",
          ],
        },
      },
      _sum: { value: true },
    });
  });

  it("sumByScraperAnd groups the KPI metrics by the given column", async () => {
    const db = fakePrisma();
    db.scraperMetric.groupBy.mockResolvedValue([
      { scraper: "amazon-pdp", country: "de", metric: "requests", outcome: "ok", _sum: { value: 5 } },
      { scraper: "amazon-pdp", country: null, metric: "connections", outcome: null, _sum: { value: null } },
    ]);
    const repository = new ScraperMetricRepository(db.prisma);
    const from = new Date(0);
    const to = new Date(10);

    expect(await repository.sumByScraperAnd("country", from, to)).toEqual([
      { scraper: "amazon-pdp", group: "de", metric: "requests", outcome: "ok", value: 5 },
      { scraper: "amazon-pdp", group: null, metric: "connections", outcome: null, value: 0 },
    ]);

    expect(db.scraperMetric.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["scraper", "country", "metric", "outcome"],
        where: expect.objectContaining({ periodStart: { gte: from, lt: to } }),
      })
    );
  });

  it("getLastReports returns the newest cpu_percent row of every scraper since a date", async () => {
    const db = fakePrisma();
    const createdAt = new Date(5);
    db.scraperMetric.groupBy.mockResolvedValue([
      { scraper: "amazon-pdp", _max: { createdAt } },
    ]);
    const repository = new ScraperMetricRepository(db.prisma);
    const since = new Date(1);

    expect(await repository.getLastReports(since)).toEqual([
      { scraper: "amazon-pdp", createdAt },
    ]);

    expect(db.scraperMetric.groupBy).toHaveBeenCalledWith({
      by: ["scraper"],
      where: { periodStart: { gte: since }, metric: "cpu_percent" },
      _max: { createdAt: true },
      orderBy: { scraper: "asc" },
    });
  });

  it("getSumByScraperAndHour converts the raw numbers", async () => {
    const db = fakePrisma();
    db.$queryRaw.mockResolvedValue([
      { scraper: "amazon-pdp", metric: "items", outcome: "data", hour: 3600n, value: 2.5 },
    ]);
    const repository = new ScraperMetricRepository(db.prisma);

    expect(await repository.getSumByScraperAndHour(new Date(0), new Date(10))).toEqual([
      { scraper: "amazon-pdp", metric: "items", outcome: "data", hour: 3600, value: 2.5 },
    ]);
  });
});
