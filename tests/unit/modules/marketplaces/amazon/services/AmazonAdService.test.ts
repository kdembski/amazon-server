import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { CountryOutlierManager } from "@/modules/anomalies/country-outlier/CountryOutlierManager";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import {
  buildAd,
  buildListingPrice,
  buildPrice,
} from "../../../../../support/factories";
import {
  deferred,
  fakeActivityCountService,
  unitLogger,
} from "../../../../../support/fakes";

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
    createMany: vi.fn().mockResolvedValue(1),
    getRecentByAd: vi.fn().mockResolvedValue([]),
  };
  const counter = fakeActivityCountService();
  const anomalyManager = { check: vi.fn() };
  const listingPrices = [[buildListingPrice()]];
  const priceMapper = { map: vi.fn().mockReturnValue(listingPrices) };

  const service = new AmazonAdService(
    repository as unknown as AmazonAdRepository,
    priceService as unknown as AmazonAdPriceService,
    counter.service,
    anomalyManager as unknown as AnomalyManager<AmazonAdSelectDto>,
    undefined,
    undefined,
    undefined,
    undefined,
    priceMapper as unknown as AmazonAdListingPriceMapper
  );

  return {
    service,
    repository,
    priceService,
    counter,
    anomalyManager,
    priceMapper,
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
  it("stores prices, counts ad_scraped and runs the error manager", async () => {
    const { service, repository, priceService, counter, anomalyManager } = setup();
    const ad = buildAd({ id: 9, asin: "B0SCRAPED" });
    repository.getById.mockResolvedValue(ad);
    const dtos = [
      { value: 1, adId: 9, countryId: 1, dispatchFrom: "Amazon" },
      { value: 2, adId: 9, countryId: 2, dispatchFrom: "Amazon" },
    ];

    await service.updatePrices(9, dtos);

    expect(repository.getById).toHaveBeenCalledWith(9);
    expect(priceService.createMany).toHaveBeenCalledWith(dtos);
    expect(priceService.creatable.create).not.toHaveBeenCalled();
    expect(counter.increment).toHaveBeenCalledWith("ad_scraped", "amazon");

    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalled());
  });

  it("checks anomalies with the recent prices, marking the scraped countries", async () => {
    const {
      service,
      repository,
      priceService,
      anomalyManager,
      priceMapper,
      listingPrices,
    } = setup();
    const ad = buildAd({ id: 9 });
    repository.getById.mockResolvedValue(ad);
    const countryPrices = [[buildPrice(), buildPrice()], [buildPrice()]];
    priceService.getRecentByAd.mockResolvedValue(countryPrices);

    await service.updatePrices(9, [
      { value: 1, adId: 9, countryId: 1, dispatchFrom: "Amazon" },
    ]);

    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalled());
    expect(priceService.getRecentByAd).toHaveBeenCalledWith(9);
    expect(priceMapper.map).toHaveBeenCalledWith(ad.asin, countryPrices, [1]);
    expect(anomalyManager.check).toHaveBeenCalledWith(ad, listingPrices);
  });

  it("stores the prices one by one when the batch fails, logging the failed ones", async () => {
    const { service, repository, priceService, counter } = setup();
    repository.getById.mockResolvedValue(buildAd());
    priceService.createMany.mockRejectedValue(new Error("batch"));
    const error = new Error("dup");
    priceService.creatable.create.mockRejectedValueOnce(error);
    const prices = [
      { value: 1, adId: 1, countryId: 1, dispatchFrom: "Amazon" },
      { value: 2, adId: 1, countryId: 2, dispatchFrom: "Amazon" },
    ];

    await service.updatePrices(1, prices);

    expect(priceService.creatable.create).toHaveBeenCalledTimes(2);
    expect(unitLogger().error).toHaveBeenCalledTimes(1);
    expect(unitLogger().error).toHaveBeenCalledWith(
      "AmazonAdService",
      "Price of ad 1 was not stored",
      { error, adId: 1, price: prices[0] }
    );
    expect(counter.increment).toHaveBeenCalledWith("ad_scraped", "amazon");
  });

  it("logs a failed anomaly check", async () => {
    const { service, repository, priceService } = setup();
    const ad = buildAd({ id: 9, asin: "B0FAIL" });
    repository.getById.mockResolvedValue(ad);
    const error = new Error("db down");
    priceService.getRecentByAd.mockRejectedValue(error);

    await service.updatePrices(9, [
      { value: 1, adId: 9, countryId: 3, dispatchFrom: "Amazon" },
    ]);

    await vi.waitFor(() =>
      expect(unitLogger().error).toHaveBeenCalledWith(
        "AmazonAdService",
        "Anomaly check of ad 9 failed",
        { error, adId: 9, asin: "B0FAIL", scrapedCountryIds: [3] }
      )
    );
  });

  it("rejects without storing anything when the ad does not exist", async () => {
    const { service, repository, priceService, counter, anomalyManager } = setup();
    repository.getById.mockRejectedValue(new Error("No AmazonAd found"));

    await expect(
      service.updatePrices(1, [
        { value: 1, adId: 1, countryId: 1, dispatchFrom: "Amazon" },
      ])
    ).rejects.toThrow("No AmazonAd found");

    expect(priceService.createMany).not.toHaveBeenCalled();
    expect(counter.increment).not.toHaveBeenCalled();
    expect(anomalyManager.check).not.toHaveBeenCalled();
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
  it("defaults to conversion and price drop managers", () => {
    vi.stubEnv("DISCORD_PRICE_DROP_TOKEN", "t");

    new AmazonAdService();

    expect(AnomalyManager).toHaveBeenCalledWith([
      expect.any(CountryOutlierManager),
      expect.any(PriceDropManager),
    ]);
  });
});
