import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { AmazonAdCategoryService } from "@/services/amazon/AmazonAdCategoryService";
import { BlacklistedKeywordService } from "@/services/blacklist/BlacklistedKeywordService";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdPricingErrorManager } from "@/managers/AmazonAdPricingErrorManager";
import {
  buildAd,
  buildCategory,
  buildKeyword,
  buildPrice,
} from "../../../support/factories";
import { deferred, fakeLogService } from "../../../support/fakes";

type ScrapAd = { id: number; asin: string; name: string };

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getCount: vi.fn().mockResolvedValue(0),
    getBlacklistedCount: vi.fn().mockResolvedValue(0),
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
  const categoryService = { getActive: vi.fn().mockResolvedValue([]) };
  const blacklistService = { getAll: vi.fn().mockResolvedValue([]) };
  const log = fakeLogService();
  const conversion = { check: vi.fn() };
  const pricing = { check: vi.fn() };

  const service = new AmazonAdService(
    repository as unknown as AmazonAdRepository,
    priceService as unknown as AmazonAdPriceService,
    categoryService as unknown as AmazonAdCategoryService,
    blacklistService as unknown as BlacklistedKeywordService,
    log.service,
    conversion as unknown as AmazonAdConversionErrorManager,
    pricing as unknown as AmazonAdPricingErrorManager
  );

  return {
    service,
    repository,
    priceService,
    categoryService,
    blacklistService,
    log,
    conversion,
    pricing,
  };
};

describe("AmazonAdService delegation", () => {
  it("delegates getAll, getCount and getBlacklistedCount", async () => {
    const { service, repository } = setup();
    const from = new Date(1);
    const to = new Date(2);
    const keywords = [buildKeyword()];

    await service.getAll();
    await service.getCount(from, to);
    await service.getBlacklistedCount(keywords);

    expect(repository.getAll).toHaveBeenCalled();
    expect(repository.getCount).toHaveBeenCalledWith(from, to);
    expect(repository.getBlacklistedCount).toHaveBeenCalledWith(keywords);
  });
});

describe("AmazonAdService.updatePrices", () => {
  it("stores prices, logs ad_scraped and runs both anomaly managers", async () => {
    const { service, repository, priceService, log, conversion, pricing } =
      setup();
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

    await vi.waitFor(() => expect(pricing.check).toHaveBeenCalled());
    expect(conversion.check).toHaveBeenCalledWith(ad, [plNewest, deNewest]);
    expect(pricing.check).toHaveBeenCalledWith(ad, [
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

  it("fetches ads for active categories minus blacklist and bumps scrapedAt", async () => {
    const { service, repository, categoryService, blacklistService } = setup();
    const categories = [buildCategory({ id: 1 }), buildCategory({ id: 2 })];
    const keywords = [buildKeyword({ value: "used" })];
    const ads: ScrapAd[] = [
      { id: 10, asin: "A", name: "Drill" },
      { id: 11, asin: "B", name: "Saw" },
    ];
    categoryService.getActive.mockResolvedValue(categories);
    blacklistService.getAll.mockResolvedValue(keywords);
    repository.getForScraping.mockResolvedValue(ads);

    const result = await service.getForScraping(2);

    expect(repository.getForScraping).toHaveBeenCalledWith(2, [1, 2], keywords);
    expect(repository.updateScrapedAt).toHaveBeenCalledWith([10, 11]);
    expect(result).toBe(ads);
  });

  it("logs ad names that still contain a blacklisted keyword", async () => {
    const { service, repository, blacklistService } = setup();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    blacklistService.getAll.mockResolvedValue([buildKeyword({ value: "used" })]);
    repository.getForScraping.mockResolvedValue([
      { id: 1, asin: "A", name: "used drill" },
      { id: 2, asin: "B", name: "new drill" },
    ]);

    await service.getForScraping(2);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("used drill");
  });

  it("delays a concurrent call by one second while another is in flight", async () => {
    const { service, repository, categoryService } = setup();
    const first = deferred<ScrapAd[]>();
    repository.getForScraping
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue([]);

    const call1 = service.getForScraping(1);
    const call2 = service.getForScraping(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(categoryService.getActive).toHaveBeenCalledTimes(1);

    first.resolve([]);
    await call1;
    await vi.advanceTimersByTimeAsync(999);
    expect(categoryService.getActive).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await call2;
    expect(categoryService.getActive).toHaveBeenCalledTimes(2);
  });

  it("resets the lock when fetching throws so the next call can proceed", async () => {
    const { service, repository, categoryService } = setup();
    repository.getForScraping
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValue([]);

    await expect(service.getForScraping(1)).rejects.toThrow("db down");

    const next = service.getForScraping(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(categoryService.getActive).toHaveBeenCalledTimes(2);
    await next;
  });

  it("keeps waiting while the first call is still in flight after one second", async () => {
    const { service, repository, categoryService } = setup();
    const first = deferred<ScrapAd[]>();
    repository.getForScraping
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue([]);

    const call1 = service.getForScraping(1);
    const call2 = service.getForScraping(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(categoryService.getActive).toHaveBeenCalledTimes(1);

    first.resolve([]);
    await call1;
    await vi.advanceTimersByTimeAsync(1000);
    await call2;
    expect(categoryService.getActive).toHaveBeenCalledTimes(2);
  });
});
