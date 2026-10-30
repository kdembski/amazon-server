import { afterEach, beforeEach, describe, expect, it, vi, Mock } from "vitest";
import _ from "lodash";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { CountryOutlierManager } from "@/modules/anomalies/country-outlier/CountryOutlierManager";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";
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

type ScrapAd = { id: number; asin: string; name: string };

const setup = (anomalyCheckQueue?: ConcurrencyQueue) => {
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
    priceMapper as unknown as AmazonAdListingPriceMapper,
    undefined,
    undefined,
    undefined,
    anomalyCheckQueue
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

    expect(priceService.createMany).toHaveBeenCalledTimes(1);
    expect(counter.increment).toHaveBeenCalledTimes(1);
    expect(repository.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("stores the prices again for another key or without one", async () => {
    const { service, priceService } = setupBatch();

    await service.applyBatch(batch, "a");
    await service.applyBatch(batch, "b");
    await service.applyBatch(batch);
    await service.applyBatch(batch);

    expect(priceService.createMany).toHaveBeenCalledTimes(4);
  });

  it("does not store the prices again when the retry follows a failed delete", async () => {
    const { service, repository, priceService } = setupBatch();
    repository.deleteMany.mockRejectedValueOnce(new Error("lock"));

    await expect(service.applyBatch(batch, "key")).rejects.toThrow("lock");
    await service.applyBatch(batch, "key");

    expect(priceService.createMany).toHaveBeenCalledTimes(1);
    expect(repository.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("stores the prices on retry when storing them failed", async () => {
    const { service, repository, priceService } = setupBatch();
    repository.getByIds.mockRejectedValueOnce(new Error("down"));

    await expect(service.applyBatch(batch, "key")).rejects.toThrow("down");
    await service.applyBatch(batch, "key");

    expect(priceService.createMany).toHaveBeenCalledTimes(1);
  });
});

describe("AmazonAdService.applyBatch anomaly checks", () => {
  it("counts every ad at once and checks anomalies 10 ads at a time", async () => {
    const { service, repository, priceService, counter, anomalyManager } = setup();
    const ids = _.range(1, 26);
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

    expect(counter.increment).toHaveBeenCalledTimes(25);
    expect(priceService.getRecentByAd).toHaveBeenCalledTimes(10);

    recent.slice(0, 10).forEach((item) => item.resolve([]));
    await vi.waitFor(() => expect(priceService.getRecentByAd).toHaveBeenCalledTimes(20));

    recent.slice(10).forEach((item) => item.resolve([]));
    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalledTimes(25));
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
    "rejects without storing one by one when the database cannot be reached (%s)",
    async (_field, fields) => {
      const { service, priceService, counter } = setupBatch([1]);
      const error = Object.assign(new Error("pool"), fields);
      priceService.createMany.mockRejectedValueOnce(error);
      const batch = { prices: [{ id: 1, prices: [price(1)] }], deleted: [] };

      await expect(service.applyBatch(batch, "key")).rejects.toBe(error);
      expect(priceService.creatable.create).not.toHaveBeenCalled();
      expect(counter.increment).not.toHaveBeenCalled();

      await service.applyBatch(batch, "key");
      expect(priceService.createMany).toHaveBeenCalledTimes(2);
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

    expect(priceService.createMany).toHaveBeenCalledWith([price(1)]);
    expect(counter.increment).toHaveBeenCalledTimes(1);
    expect(unitLogger().warn).toHaveBeenCalledWith(
      "AmazonAdService",
      "Skipped the prices of 2 ads missing in the database",
      { adIds: [2, 3] }
    );
    await vi.waitFor(() => expect(anomalyManager.check).toHaveBeenCalledTimes(1));
  });

  it("warns once per batch when every price was stored one by one", async () => {
    const { service, priceService } = setupBatch([1, 2]);
    const error = new Error("FK");
    priceService.createMany.mockRejectedValue(error);

    await service.applyBatch({
      prices: [
        { id: 1, prices: [price(1), price(1, 2)] },
        { id: 2, prices: [price(2)] },
      ],
      deleted: [],
    });

    expect(unitLogger().error).not.toHaveBeenCalled();
    expect(unitLogger().warn).toHaveBeenCalledWith(
      "AmazonAdService",
      "Batch insert of 3 prices failed, 0 of them were not stored one by one",
      { error, prices: 3, failed: 0, failedAdIds: [], failedError: undefined }
    );
  });

  it("logs one error per batch with the prices that were not stored", async () => {
    const { service, priceService } = setupBatch([1, 2]);
    const error = new Error("FK");
    const first = new Error("row 1");
    priceService.createMany.mockRejectedValue(error);
    priceService.creatable.create
      .mockRejectedValueOnce(first)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("row 2"));

    await service.applyBatch({
      prices: [
        { id: 1, prices: [price(1), price(1, 2)] },
        { id: 2, prices: [price(2)] },
      ],
      deleted: [],
    });

    expect(unitLogger().error).toHaveBeenCalledTimes(1);
    expect(unitLogger().error).toHaveBeenCalledWith(
      "AmazonAdService",
      "Batch insert of 3 prices failed, 2 of them were not stored one by one",
      { error, prices: 3, failed: 2, failedAdIds: [1, 2], failedError: first }
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

  it("warns at most once a minute when anomaly checks wait a minute or longer", async () => {
    const waits = [59_999, 60_000, 120_000];
    const queue = {
      size: 4,
      add: vi.fn((run: (waitedMs: number) => Promise<unknown>) => run(waits.shift()!)),
    };
    const { service, repository } = setup(queue as unknown as ConcurrencyQueue);
    repository.getById.mockResolvedValue(buildAd());
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);

    await service.updatePrices(1, [price(1)]);
    await service.updatePrices(1, [price(1)]);
    now.mockReturnValue(159_999);
    await service.updatePrices(1, [price(1)]);
    now.mockRestore();

    expect(unitLogger().warn.mock.calls).toEqual([
      [
        "AmazonAdService",
        "Anomaly checks run 60 s after the prices were stored",
        { waitedMs: 60_000, queuedAnomalyChecks: 4 },
      ],
    ]);
  });

  it("stores the prices of one ad after another when the batch insert fails", async () => {
    const { service, repository, priceService } = setup();
    Object.assign(repository, {
      getByIds: vi.fn().mockResolvedValue([buildAd({ id: 1 }), buildAd({ id: 2 })]),
    });
    priceService.createMany.mockRejectedValue(new Error("FK"));
    const first = deferred<object>();
    priceService.creatable.create
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue({});
    const price = (adId: number) => ({ value: 1, adId, countryId: 1, dispatchFrom: "Amazon" });

    const result = service.applyBatch({
      prices: [
        { id: 1, prices: [price(1)] },
        { id: 2, prices: [price(2)] },
      ],
      deleted: [],
    });
    await vi.waitFor(() => expect(priceService.creatable.create).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(priceService.creatable.create).toHaveBeenCalledTimes(1);

    first.resolve({});
    await result;
    expect(priceService.creatable.create.mock.calls).toEqual([[price(1)], [price(2)]]);
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

  it("stores the prices one by one when the batch fails, logging the failed ones", async () => {
    const { service, repository, priceService, counter } = setup();
    repository.getById.mockResolvedValue(buildAd());
    const batchError = new Error("batch");
    priceService.createMany.mockRejectedValue(batchError);
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
      "Batch insert of 2 prices failed, 1 of them were not stored one by one",
      { error: batchError, prices: 2, failed: 1, failedAdIds: [1], failedError: error }
    );
    expect(counter.increment).toHaveBeenCalledWith("ad_scraped", "amazon", [1, 2]);
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
