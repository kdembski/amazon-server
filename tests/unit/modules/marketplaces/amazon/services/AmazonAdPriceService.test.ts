import { describe, expect, it, vi } from "vitest";
import { deferred, unitLogger } from "../../../../../support/fakes";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getRecentByAd: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue(1),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteOlderThan: vi.fn().mockResolvedValue(3),
  };
  const service = new AmazonAdPriceService(
    repository as unknown as AmazonAdPriceRepository
  );
  return { service, repository };
};

describe("AmazonAdPriceService", () => {
  it("delegates getRecentByAd", async () => {
    const { service, repository } = setup();
    await service.getRecentByAd(1);
    expect(repository.getRecentByAd).toHaveBeenCalledWith(1);
  });

  it("delegates deleteOlderThan", async () => {
    const { service, repository } = setup();
    const date = new Date(5);

    expect(await service.deleteOlderThan(date)).toBe(3);
    expect(repository.deleteOlderThan).toHaveBeenCalledWith(date);
  });

  it("wires creatable, updatable and deletable to the repository", async () => {
    const { service, repository } = setup();

    await service.creatable.create({
      value: 5,
      adId: 1,
      countryId: 2,
      dispatchFrom: "Amazon",
    });
    await service.updatable.update(7, { value: 6, adId: 1, countryId: 2 });
    await service.deletable.delete(9);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 5,
        ad: { connect: { id: 1 } },
        country: { connect: { countryId: 2 } },
        createdAt: expect.any(Date),
      })
    );
    expect(repository.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ value: 6, updatedAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(9);
  });

  it("maps the prices for createMany", async () => {
    const { service, repository } = setup();

    await service.createMany([{ value: 5, adId: 1, countryId: 2, dispatchFrom: "Amazon" }]);

    expect(repository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ value: 5, adId: 1, countryId: 2, createdAt: expect.any(Date) }),
    ]);
  });
});

describe("AmazonAdPriceService.store", () => {
  const price = (adId: number, countryId = 1) => ({ value: 1, adId, countryId, dispatchFrom: "Amazon" });

  it("stores all prices with one INSERT", async () => {
    const { service, repository } = setup();

    await service.store([price(1), price(2)]);

    expect(repository.createMany).toHaveBeenCalledTimes(1);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ["code", { code: "P2024" }],
    ["errorCode", { errorCode: "P1001" }],
  ])("rejects without storing one by one when the database cannot be reached (%s)", async (_f, fields) => {
    const { service, repository } = setup();
    const error = Object.assign(new Error("pool"), fields);
    repository.createMany.mockRejectedValueOnce(error);

    await expect(service.store([price(1)])).rejects.toBe(error);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("warns when every price was stored one by one", async () => {
    const { service, repository } = setup();
    const error = new Error("FK");
    repository.createMany.mockRejectedValue(error);

    await service.store([price(1), price(1, 2), price(2)]);

    expect(repository.create).toHaveBeenCalledTimes(3);
    expect(unitLogger().error).not.toHaveBeenCalled();
    expect(unitLogger().warn).toHaveBeenCalledWith(
      "AmazonAdPriceService",
      "Batch insert of 3 prices failed, 0 of them were not stored one by one",
      { error, prices: 3, failed: 0, failedAdIds: [], failedError: undefined }
    );
  });

  it("logs one error with the prices that were not stored", async () => {
    const { service, repository } = setup();
    const error = new Error("FK");
    const first = new Error("row 1");
    repository.createMany.mockRejectedValue(error);
    repository.create
      .mockRejectedValueOnce(first)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("row 2"));

    await service.store([price(1), price(1, 2), price(2)]);

    expect(unitLogger().error).toHaveBeenCalledTimes(1);
    expect(unitLogger().error).toHaveBeenCalledWith(
      "AmazonAdPriceService",
      "Batch insert of 3 prices failed, 2 of them were not stored one by one",
      { error, prices: 3, failed: 2, failedAdIds: [1, 2], failedError: first }
    );
  });

  it("stores the prices of one ad after another", async () => {
    const { service, repository } = setup();
    repository.createMany.mockRejectedValue(new Error("FK"));
    const firstAd = deferred<object>();
    repository.create.mockReturnValueOnce(firstAd.promise).mockResolvedValue({});

    const result = service.store([price(1), price(2)]);
    await vi.waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(repository.create).toHaveBeenCalledTimes(1);

    firstAd.resolve({});
    await result;
    expect(repository.create).toHaveBeenCalledTimes(2);
  });
});
