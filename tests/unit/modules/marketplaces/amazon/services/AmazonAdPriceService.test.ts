import { describe, expect, it, vi } from "vitest";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getByAdAndCountry: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new AmazonAdPriceService(
    repository as unknown as AmazonAdPriceRepository
  );
  return { service, repository };
};

describe("AmazonAdPriceService", () => {
  it("delegates getByAdAndCountry", async () => {
    const { service, repository } = setup();
    await service.getByAdAndCountry(1, [2, 3]);
    expect(repository.getByAdAndCountry).toHaveBeenCalledWith(1, [2, 3]);
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
        country: { connect: { id: 2 } },
        createdAt: expect.any(Date),
      })
    );
    expect(repository.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ value: 6, updatedAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(9);
  });
});
