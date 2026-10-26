import { describe, expect, it, vi } from "vitest";
import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";
import { ActivityCount, ActivityCounter } from "@/modules/monitoring/services/ActivityCounter";
import { deferred } from "../../../../support/fakes";

const setup = () => {
  const repository = {
    createMany: vi.fn().mockResolvedValue(1),
    getSum: vi.fn().mockResolvedValue(0),
  };
  const counter = { counts: new Map<string, ActivityCount>() };
  const service = new ActivityCountService(
    repository as unknown as ActivityEventRepository,
    counter as unknown as ActivityCounter
  );
  return { service, repository, counter };
};

const event = (type: string, count: number) => ({
  type,
  marketplace: "amazon",
  data: { count },
  createdAt: expect.any(Date),
});

describe("ActivityCountService", () => {
  it("increments the count of a type and marketplace", () => {
    const { service, counter } = setup();

    service.increment("ad_scraped", "amazon");
    service.increment("ad_scraped", "amazon");
    service.increment("price_drop_sent", "amazon");

    expect([...counter.counts.values()]).toEqual([
      { type: "ad_scraped", marketplace: "amazon", count: 2 },
      { type: "price_drop_sent", marketplace: "amazon", count: 1 },
    ]);
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
    service.increment("ad_scraped", "amazon");
    service.increment("ad_scraped", "amazon");
    service.increment("price_drop_sent", "amazon");

    const flushing = service.flush();
    service.increment("ad_scraped", "amazon");
    write.reject(error);

    await expect(flushing).rejects.toBe(error);
    expect([...counter.counts.values()]).toEqual([
      { type: "ad_scraped", marketplace: "amazon", count: 3 },
      { type: "price_drop_sent", marketplace: "amazon", count: 1 },
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
});
