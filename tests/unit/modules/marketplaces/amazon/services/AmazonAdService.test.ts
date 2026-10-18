import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { ConversionErrorManager } from "@/modules/anomalies/conversion-error/ConversionErrorManager";
import { PricingErrorManager } from "@/modules/anomalies/pricing-error/PricingErrorManager";
import { AmazonAdListingMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingMapper";
import {
  buildAd,
  buildListing,
  buildListingPrice,
  buildPrice,
} from "../../../../../support/factories";
import { deferred, fakeLogService } from "../../../../../support/fakes";

vi.mock("@/modules/anomalies/AnomalyManager");
vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return { ...original, WebhookClient: vi.fn(function () { return {}; }) };
});

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
  const listing = buildListing();
  const listingPrices = [[buildListingPrice()]];
  const listingMapper = {
    map: vi.fn().mockReturnValue({ listing, countryPrices: listingPrices }),
  };

  const service = new AmazonAdService(
    repository as unknown as AmazonAdRepository,
    priceService as unknown as AmazonAdPriceService,
    log.service,
    anomalyManager as unknown as AnomalyManager,
    undefined,
    undefined,
    undefined,
    undefined,
    listingMapper as unknown as AmazonAdListingMapper
  );

  return {
    service,
    repository,
    priceService,
    log,
    anomalyManager,
    listingMapper,
    listing,
    listingPrices,
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
  });

  it("checks anomalies with the mapped listing and prices", async () => {
    const {
      service,
      repository,
      priceService,
      anomalyManager,
      listingMapper,
      listing,
      listingPrices,
    } = setup();
    const ad = buildAd({ id: 9 });
    repository.getById.mockResolvedValue(ad);
    const countryPrices = [[buildPrice(), buildPrice()], [buildPrice()]];
    priceService.getByAdAndCountry.mockResolvedValue(countryPrices);

    await service.updatePrices(9, [
      { value: 1, adId: 9, countryId: 1, dispatchFrom: "Amazon" },
    ]);

    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalled());
    expect(listingMapper.map).toHaveBeenCalledWith(ad, countryPrices);
    expect(anomalyManager.check).toHaveBeenCalledWith(listing, listingPrices);
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

describe("AmazonAdService defaults", () => {
  it("defaults to conversion and pricing error managers", () => {
    vi.stubEnv("DISCORD_PRICING_ERROR_TOKEN", "t");

    new AmazonAdService();

    expect(AnomalyManager).toHaveBeenCalledWith([
      expect.any(ConversionErrorManager),
      expect.any(PricingErrorManager),
    ]);
  });
});
