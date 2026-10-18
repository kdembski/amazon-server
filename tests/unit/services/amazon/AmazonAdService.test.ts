import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { AmazonAdAnomalyManager } from "@/managers/AmazonAdAnomalyManager";
import { buildAd, buildPrice } from "../../../support/factories";
import { deferred, fakeLogService } from "../../../support/fakes";

type ScrapAd = { id: number; asin: string; name: string };

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getCount: vi.fn().mockResolvedValue(0),
    getForScraping: vi.fn().mockResolvedValue([]),
    updateScrapedAt: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const priceService = {
    creatable: { create: vi.fn().mockResolvedValue({}) },
    getByAdAndCountry: vi.fn().mockResolvedValue([]),
  };
  const log = fakeLogService();
  const anomalyManager = { check: vi.fn() };

  const service = new AmazonAdService(
    repository as unknown as AmazonAdRepository,
    priceService as unknown as AmazonAdPriceService,
    log.service,
    anomalyManager as unknown as AmazonAdAnomalyManager
  );

  return {
    service,
    repository,
    priceService,
    log,
    anomalyManager,
  };
};

describe("AmazonAdService delegation", () => {
  it("delegates getAll and getCount", async () => {
    const { service, repository } = setup();
    const from = new Date(1);
    const to = new Date(2);

    await service.getAll();
    await service.getCount(from, to);

    expect(repository.getAll).toHaveBeenCalled();
    expect(repository.getCount).toHaveBeenCalledWith(from, to);
  });
});

describe("AmazonAdService.updatePrices", () => {
  it("stores prices, logs ad_scraped and runs the error manager", async () => {
    const { service, repository, priceService, log, anomalyManager } = setup();
    const ad = buildAd({ id: 9 });
    repository.getById.mockResolvedValue(ad);
    const plNewest = buildPrice();
    const plOlder = buildPrice();
    const deNewest = buildPrice();
    priceService.getByAdAndCountry.mockResolvedValue([
      [plNewest, plOlder],
      [deNewest],
    ]);
    const dtos = [
      { value: 1, adId: 9, countryId: 1, dispatchFrom: "Amazon" },
      { value: 2, adId: 9, countryId: 2, dispatchFrom: "Amazon" },
    ];

    await service.updatePrices(9, dtos);

    expect(priceService.creatable.create).toHaveBeenCalledTimes(2);
    expect(priceService.creatable.create).toHaveBeenCalledWith(dtos[0]);
    expect(priceService.creatable.create).toHaveBeenCalledWith(dtos[1]);
    expect(log.create).toHaveBeenCalledWith({ event: "ad_scraped" });
    expect(repository.getById).toHaveBeenCalledWith(9);
    expect(priceService.getByAdAndCountry).toHaveBeenCalledWith(9, [1, 2]);

    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalled());
    expect(anomalyManager.check).toHaveBeenCalledWith(ad, [
      [plNewest, plOlder],
      [deNewest],
    ]);
  });

  it("continues when a single price insert fails", async () => {
    const { service, repository, priceService, log } = setup();
    repository.getById.mockResolvedValue(buildAd());
    priceService.creatable.create.mockRejectedValueOnce(new Error("dup"));

    await service.updatePrices(1, [
      { value: 1, adId: 1, countryId: 1, dispatchFrom: "Amazon" },
      { value: 2, adId: 1, countryId: 2, dispatchFrom: "Amazon" },
    ]);

    expect(priceService.creatable.create).toHaveBeenCalledTimes(2);
    expect(log.create).toHaveBeenCalledWith({ event: "ad_scraped" });
  });
});

describe("AmazonAdService.getForScraping", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    // A failed assertion before the lock is released would otherwise cascade
    // into every later test in this file.
    (AmazonAdService as unknown as { isGetting: boolean }).isGetting = false;
  });

  it("fetches matching ads and bumps scrapedAt", async () => {
    const { service, repository } = setup();
    const ads: ScrapAd[] = [
      { id: 10, asin: "A", name: "Drill" },
      { id: 11, asin: "B", name: "Saw" },
    ];
    repository.getForScraping.mockResolvedValue(ads);

    const result = await service.getForScraping(2);

    expect(repository.getForScraping).toHaveBeenCalledWith(2);
    expect(repository.updateScrapedAt).toHaveBeenCalledWith([10, 11]);
    expect(result).toBe(ads);
  });

  it("delays a concurrent call by one second while another is in flight", async () => {
    const { service, repository } = setup();
    const first = deferred<ScrapAd[]>();
    repository.getForScraping
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue([]);

    const call1 = service.getForScraping(1);
    const call2 = service.getForScraping(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(repository.getForScraping).toHaveBeenCalledTimes(1);

    first.resolve([]);
    await call1;
    await vi.advanceTimersByTimeAsync(999);
    expect(repository.getForScraping).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await call2;
    expect(repository.getForScraping).toHaveBeenCalledTimes(2);
  });

  it("resets the lock when fetching throws so the next call can proceed", async () => {
    const { service, repository } = setup();
    repository.getForScraping
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValue([]);

    await expect(service.getForScraping(1)).rejects.toThrow("db down");

    const next = service.getForScraping(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(repository.getForScraping).toHaveBeenCalledTimes(2);
    await next;
  });

  it("keeps waiting while the first call is still in flight after one second", async () => {
    const { service, repository } = setup();
    const first = deferred<ScrapAd[]>();
    repository.getForScraping
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue([]);

    const call1 = service.getForScraping(1);
    const call2 = service.getForScraping(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(repository.getForScraping).toHaveBeenCalledTimes(1);

    first.resolve([]);
    await call1;
    await vi.advanceTimersByTimeAsync(1000);
    await call2;
    expect(repository.getForScraping).toHaveBeenCalledTimes(2);
  });
});
