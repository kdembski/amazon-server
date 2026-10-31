import { describe, expect, it, vi } from "vitest";
import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { BusinessLogRepository } from "@/modules/monitoring/repositories/BusinessLogRepository";
import { ActivityCount, ActivityCounter } from "@/modules/monitoring/services/ActivityCounter";
import { deferred } from "../../../../support/fakes";

const setup = () => {
  const repository = {
    createMany: vi.fn().mockResolvedValue(1),
    getSum: vi.fn().mockResolvedValue(0),
    getData: vi.fn().mockResolvedValue([]),
  };
  const counter = { counts: new Map<string, ActivityCount>() };
  const service = new ActivityCountService(
    repository as unknown as BusinessLogRepository,
    counter as unknown as ActivityCounter
  );
  return { service, repository, counter };
};

const event = (type: string, count: number) => ({
  type,
  marketplace: "amazon",
  data: { count, prices: {}, countries: {} },
  createdAt: expect.any(Date),
});

const count = (type: string, value: number) => {
  return { type, marketplace: "amazon", count: value, prices: {}, countries: {} };
};

describe("ActivityCountService", () => {
  it("increments the count of a type and marketplace", () => {
    const { service, counter } = setup();

    service.increment("ad_scraped", "amazon");
    service.increment("ad_scraped", "amazon");
    service.increment("price_drop_sent", "amazon");

    expect([...counter.counts.values()]).toEqual([
      count("ad_scraped", 2),
      count("price_drop_sent", 1),
    ]);
  });

  it("counts items by their number of distinct countries and by country", () => {
    const { service, counter } = setup();

    service.increment("ad_scraped", "amazon", [1, 2, 3, 3]);
    service.increment("ad_scraped", "amazon", [1, 2, 3]);
    service.increment("ad_scraped", "amazon", [4]);
    service.increment("ad_scraped", "amazon");

    expect(counter.counts.get("ad_scraped:amazon")).toEqual({
      type: "ad_scraped",
      marketplace: "amazon",
      count: 4,
      prices: { 1: 1, 3: 2 },
      countries: { 1: 2, 2: 2, 3: 2, 4: 1 },
    });
  });

  it("flush stores one event per count and starts from zero", async () => {
    const { service, repository, counter } = setup();
    service.increment("ad_scraped", "amazon");
    service.increment("ad_scraped", "amazon");

    await service.flush();

    expect(repository.createMany).toHaveBeenCalledWith([event("ad_scraped", 2)]);
    expect(counter.counts.size).toBe(0);
  });

  it("flush writes nothing without counts", async () => {
    const { service, repository } = setup();

    await service.flush();

    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it("keeps the increments made during the write for the next flush", async () => {
    const { service, repository, counter } = setup();
    const write = deferred<number>();
    repository.createMany.mockReturnValue(write.promise);
    service.increment("ad_scraped", "amazon");

    const flushing = service.flush();
    service.increment("ad_scraped", "amazon");
    write.resolve(1);
    await flushing;

    expect(repository.createMany).toHaveBeenCalledWith([event("ad_scraped", 1)]);
    expect(counter.counts.get("ad_scraped:amazon")?.count).toBe(1);
  });

  it("puts the counts of a failed write back and rethrows", async () => {
    const { service, repository, counter } = setup();
    const error = new Error("db down");
    const write = deferred<number>();
    repository.createMany.mockReturnValue(write.promise);
    service.increment("ad_scraped", "amazon", [1, 2]);
    service.increment("ad_scraped", "amazon");
    service.increment("price_drop_sent", "amazon");

    const flushing = service.flush();
    service.increment("ad_scraped", "amazon", [2]);
    write.reject(error);

    await expect(flushing).rejects.toBe(error);
    expect([...counter.counts.values()]).toEqual([
      {
        type: "ad_scraped",
        marketplace: "amazon",
        count: 3,
        prices: { 1: 1, 2: 1 },
        countries: { 1: 1, 2: 2 },
      },
      count("price_drop_sent", 1),
    ]);
  });

  it("getCount sums the stored counts", async () => {
    const { service, repository } = setup();
    const from = new Date(1);
    const to = new Date(2);
    repository.getSum.mockResolvedValue(9);

    expect(await service.getCount("ad_scraped", from, to)).toBe(9);
    expect(repository.getSum).toHaveBeenCalledWith("ad_scraped", from, to);
  });

  it("getCountWithMinPrices sums the items with at least the given number of prices", async () => {
    const { service, repository } = setup();
    const from = new Date(1);
    const to = new Date(2);
    repository.getData.mockResolvedValue([
      { count: 9, prices: { 3: 2, 4: 3, 10: 4 } },
      { count: 1 },
      { count: 2, prices: { 5: 2 } },
    ]);

    expect(await service.getCountWithMinPrices("ad_scraped", 4, from, to)).toBe(9);
    expect(repository.getData).toHaveBeenCalledWith("ad_scraped", from, to);
  });
});
