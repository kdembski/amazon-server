import { describe, expect, it, vi, Mock } from "vitest";
import _ from "lodash";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdCategoryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdCategoryRepository";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { CountryOutlierManager } from "@/modules/anomalies/country-outlier/CountryOutlierManager";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import {
  buildAd,
  buildListingPrice,
  buildPrice,
} from "../../../../../support/factories";
import {
  deferred,
  fakeActivityCountService,
  resetSingleton,
  unitLogger,
} from "../../../../../support/fakes";

vi.mock("@/modules/anomalies/AnomalyManager");
vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return { ...original, WebhookClient: vi.fn(function () { return {}; }) };
});

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getCount: vi.fn().mockResolvedValue(0),
    getForScraping: vi.fn().mockResolvedValue([]),
    updateScrapedAt: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    createMany: vi.fn().mockResolvedValue(2),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const priceService = {
    store: vi.fn().mockResolvedValue(undefined),
    getRecentByAd: vi.fn().mockResolvedValue([]),
  };
  const counter = fakeActivityCountService();
  const categoryRepository = {
    upsertByName: vi.fn(async (name: string) => ({ id: name === "Books" ? 7 : 8 })),
  };
  const anomalyManager = { check: vi.fn() };
  const listingPrices = [[buildListingPrice()]];
  const priceMapper = { map: vi.fn().mockReturnValue(listingPrices) };
  const missingService = {
    store: vi.fn().mockResolvedValue(0),
    getRouteIdsByAd: vi.fn().mockResolvedValue({}),
  };

  const service = new AmazonAdService(
    repository as unknown as AmazonAdRepository,
    priceService as unknown as AmazonAdPriceService,
    counter.service,
    anomalyManager as unknown as AnomalyManager<AmazonAdSelectDto>,
    undefined,
    undefined,
    undefined,
    undefined,
    priceMapper as unknown as AmazonAdListingPriceMapper,
    undefined,
    categoryRepository as unknown as AmazonAdCategoryRepository,
    undefined,
    undefined,
    missingService as unknown as AmazonAdMissingService
  );

  return {
    service,
    repository,
    priceService,
    counter,
    anomalyManager,
    priceMapper,
    listingPrices,
    missingService,
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

describe("AmazonAdService.createMany", () => {
  it("stores the ads under their categories and counts the created ones", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-04T10:00:00Z") });
    const { service, repository, counter } = setup();
    const ad = (asin: string, categoryName: string) => {
      return { asin, name: `n-${asin}`, image: "i", categoryName };
    };

    expect(await service.createMany([ad("A", "Books"), ad("B", "Toys"), ad("C", "Books")])).toEqual({
      count: 2,
    });

    const now = new Date("2026-11-04T10:00:00Z");
    expect(repository.createMany).toHaveBeenCalledWith(
      [
        ["A", 7],
        ["B", 8],
        ["C", 7],
      ].map(([asin, categoryId]) => ({
        asin,
        name: `n-${asin}`,
        image: "i",
        excluded: null,
        categoryId,
        createdAt: now,
        updatedAt: now,
      }))
    );
    expect(counter.incrementBy).toHaveBeenCalledWith("ad_created", "amazon", 2);
    vi.useRealTimers();
  });
});

describe("AmazonAdService.applyBatch with an idempotency key", () => {
  const price = { value: 1, adId: 1, countryId: 1, dispatchFrom: "Amazon" };
  const batch = { prices: [{ id: 1, prices: [price] }], deleted: [5] };

  const setupBatch = () => {
    resetSingleton(IdempotencyCache);
    const context = setup();
    Object.assign(context.repository, {
      getByIds: vi.fn().mockResolvedValue([buildAd({ id: 1 })]),
      deleteMany: vi.fn().mockResolvedValue(1),
    });
    return context as typeof context & {
      repository: { getByIds: Mock; deleteMany: Mock };
    };
  };

  it("stores the prices of a key once and deletes again", async () => {
    const { service, repository, priceService, counter } = setupBatch();

    await service.applyBatch(batch, "key");
    await service.applyBatch(batch, "key");

    expect(priceService.store).toHaveBeenCalledTimes(1);
    expect(counter.increment).toHaveBeenCalledTimes(1);
    expect(repository.deleteMany).toHaveBeenCalledTimes(2);
    expect(counter.incrementBy).toHaveBeenCalledWith("ad_deleted", "amazon", 1);
  });

  it("stores the prices again for another key or without one", async () => {
    const { service, priceService } = setupBatch();

    await service.applyBatch(batch, "a");
    await service.applyBatch(batch, "b");
    await service.applyBatch(batch);
    await service.applyBatch(batch);

    expect(priceService.store).toHaveBeenCalledTimes(4);
  });

  it("does not store the prices again when the retry follows a failed delete", async () => {
    const { service, repository, priceService } = setupBatch();
    repository.deleteMany.mockRejectedValueOnce(new Error("lock"));

    await expect(service.applyBatch(batch, "key")).rejects.toThrow("lock");
    await service.applyBatch(batch, "key");

    expect(priceService.store).toHaveBeenCalledTimes(1);
    expect(repository.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("stores the prices on retry when storing them failed", async () => {
    const { service, repository, priceService } = setupBatch();
    repository.getByIds.mockRejectedValueOnce(new Error("down"));

    await expect(service.applyBatch(batch, "key")).rejects.toThrow("down");
    await service.applyBatch(batch, "key");

    expect(priceService.store).toHaveBeenCalledTimes(1);
  });
});

describe("AmazonAdService.applyBatch anomaly checks", () => {
  it("counts every ad at once and checks anomalies 40 ads at a time", async () => {
    const { service, repository, priceService, counter, anomalyManager } = setup();
    const ids = _.range(1, 101);
    Object.assign(repository, {
      getByIds: vi.fn().mockResolvedValue(ids.map((id) => buildAd({ id }))),
    });
    const recent = ids.map(() => deferred<never[]>());
    ids.forEach((_id, i) => priceService.getRecentByAd.mockReturnValueOnce(recent[i].promise));
    const price = (adId: number) => ({ value: 1, adId, countryId: 1, dispatchFrom: "Amazon" });

    await service.applyBatch({
      prices: ids.map((id) => ({ id, prices: [price(id)] })),
      deleted: [],
    });

    expect(counter.increment).toHaveBeenCalledTimes(100);
    expect(priceService.getRecentByAd).toHaveBeenCalledTimes(40);

    recent.slice(0, 40).forEach((item) => item.resolve([]));
    await vi.waitFor(() => expect(priceService.getRecentByAd).toHaveBeenCalledTimes(80));

    recent.slice(40).forEach((item) => item.resolve([]));
    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalledTimes(100));
  });

  it("goes on with the next ads when one check fails", async () => {
    const { service, repository, priceService, anomalyManager } = setup();
    const ids = _.range(1, 12);
    Object.assign(repository, {
      getByIds: vi.fn().mockResolvedValue(ids.map((id) => buildAd({ id }))),
    });
    priceService.getRecentByAd.mockRejectedValueOnce(new Error("pool")).mockResolvedValue([]);

    await service.applyBatch({
      prices: ids.map((id) => ({ id, prices: [] })),
      deleted: [],
    });

    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalledTimes(10));
  });
});

describe("AmazonAdService.applyBatch", () => {
  const price = (adId: number, countryId = 1) => ({
    value: 1,
    adId,
    countryId,
    dispatchFrom: "Amazon",
  });

  const setupBatch = (adIds: number[]) => {
    resetSingleton(IdempotencyCache);
    const context = setup();
    Object.assign(context.repository, {
      getByIds: vi.fn().mockResolvedValue(adIds.map((id) => buildAd({ id }))),
      deleteMany: vi.fn().mockResolvedValue(0),
    });
    return context;
  };

  it.each([
    ["code", { code: "P2024" }],
    ["errorCode", { errorCode: "P1001" }],
  ])(
    "rejects when the prices cannot be stored (%s)",
    async (_field, fields) => {
      const { service, priceService, counter } = setupBatch([1]);
      const error = Object.assign(new Error("pool"), fields);
      priceService.store.mockRejectedValueOnce(error);
      const batch = { prices: [{ id: 1, prices: [price(1)] }], deleted: [] };

      await expect(service.applyBatch(batch, "key")).rejects.toBe(error);
      expect(counter.increment).not.toHaveBeenCalled();

      await service.applyBatch(batch, "key");
      expect(priceService.store).toHaveBeenCalledTimes(2);
    }
  );

  it("skips the prices of ads missing in the database", async () => {
    const { service, priceService, counter, anomalyManager } = setupBatch([1]);

    await service.applyBatch({
      prices: [
        { id: 1, prices: [price(1)] },
        { id: 2, prices: [price(2)] },
        { id: 3, prices: [price(3)] },
      ],
      deleted: [],
    });

    expect(priceService.store).toHaveBeenCalledWith([price(1)]);
    expect(counter.increment).toHaveBeenCalledTimes(1);
    expect(unitLogger().warn).toHaveBeenCalledWith(
      "AmazonAdService",
      "Skipped the prices of 2 ads missing in the database",
      { adIds: [2, 3] }
    );
    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalledTimes(1));
  });

  it("stores the missing routes of the ads found in the database", async () => {
    const { service, missingService } = setupBatch([1, 2]);

    await service.applyBatch({
      prices: [
        { id: 1, prices: [price(1)], missingRouteIds: [3, 4] },
        { id: 2, prices: [] },
        { id: 5, prices: [], missingRouteIds: [3] },
      ],
      deleted: [],
    });

    expect(missingService.store).toHaveBeenCalledWith([
      { id: 1, routeIds: [3, 4] },
      { id: 2, routeIds: [] },
    ]);
  });

  it("logs a failed store of missing routes and still applies the batch", async () => {
    const { service, missingService, counter } = setupBatch([1, 2]);
    const error = new Error("FK");
    missingService.store.mockRejectedValue(error);

    const result = await service.applyBatch({
      prices: [
        { id: 1, prices: [price(1)], missingRouteIds: [3] },
        { id: 2, prices: [price(2)] },
      ],
      deleted: [],
    });

    expect(result).toEqual({ prices: 2, deleted: 0 });
    expect(counter.increment).toHaveBeenCalledTimes(2);
    expect(unitLogger().error).toHaveBeenCalledWith(
      "AmazonAdService",
      "Storing the missing routes of ads failed",
      { error, adIds: [1] }
    );
  });

  it("warns about a batch that took over 10 s", async () => {
    const { service } = setupBatch([1]);
    const now = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(10_001);

    await service.applyBatch({ prices: [{ id: 1, prices: [price(1), price(1, 2)] }], deleted: [7] }, "key");
    now.mockRestore();

    expect(unitLogger().warn).toHaveBeenCalledWith(
      "AmazonAdService",
      "Batch of 1 ads took 10001 ms",
      { ads: 1, prices: 2, deleted: 1, durationMs: 10_001, key: "key", queuedAnomalyChecks: 0 }
    );
  });

  it("does not warn about a batch of 10 s", async () => {
    const { service } = setupBatch([]);
    const now = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(10_000);

    await service.applyBatch({ prices: [], deleted: [7] });
    now.mockRestore();

    expect(unitLogger().warn).not.toHaveBeenCalled();
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
    expect(priceService.store).toHaveBeenCalledWith(dtos);
    expect(counter.increment).toHaveBeenCalledWith("ad_scraped", "amazon", [1, 2]);

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
        "AnomalyCheckQueue",
        "Anomaly check failed",
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

    expect(priceService.store).not.toHaveBeenCalled();
    expect(counter.increment).not.toHaveBeenCalled();
    expect(anomalyManager.check).not.toHaveBeenCalled();
  });
});

describe("AmazonAdService defaults", () => {
  it("defaults to conversion and price drop managers", () => {
    new AmazonAdService();

    expect(AnomalyManager).toHaveBeenCalledWith([
      expect.any(CountryOutlierManager),
      expect.any(PriceDropManager),
    ]);
  });
});
