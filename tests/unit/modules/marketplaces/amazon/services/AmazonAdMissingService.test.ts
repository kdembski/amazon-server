import { describe, expect, it, vi } from "vitest";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import { AmazonAdMissingRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdMissingRepository";

const setup = () => {
  const repository = {
    getByAdIds: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue(0),
    deleteOlderThan: vi.fn().mockResolvedValue(0),
  };
  const service = new AmazonAdMissingService(repository as unknown as AmazonAdMissingRepository);
  return { service, repository };
};

describe("AmazonAdMissingService", () => {
  it("groups the missing country ids by ad", async () => {
    const { service, repository } = setup();
    repository.getByAdIds.mockResolvedValue([
      { adId: 1, countryId: 2 },
      { adId: 1, countryId: 3 },
      { adId: 4, countryId: 2 },
    ]);

    expect(await service.getCountryIdsByAd([1, 4, 5])).toEqual({ 1: [2, 3], 4: [2] });
    expect(repository.getByAdIds).toHaveBeenCalledWith([1, 4, 5]);
  });

  it("does not query without ads", async () => {
    const { service, repository } = setup();

    expect(await service.getCountryIdsByAd([])).toEqual({});
    expect(repository.getByAdIds).not.toHaveBeenCalled();
  });

  it("stores one row per ad and country", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(7));
    const { service, repository } = setup();
    repository.createMany.mockResolvedValue(3);

    const count = await service.store([
      { id: 1, countryIds: [2, 3] },
      { id: 4, countryIds: [] },
      { id: 5, countryIds: [2] },
    ]);

    expect(count).toBe(3);
    expect(repository.createMany).toHaveBeenCalledWith([
      { adId: 1, countryId: 2, createdAt: new Date(7) },
      { adId: 1, countryId: 3, createdAt: new Date(7) },
      { adId: 5, countryId: 2, createdAt: new Date(7) },
    ]);
    vi.useRealTimers();
  });

  it("does not insert without missing countries", async () => {
    const { service, repository } = setup();

    expect(await service.store([{ id: 1, countryIds: [] }])).toBe(0);
    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it("delegates deleteOlderThan", async () => {
    const { service, repository } = setup();
    repository.deleteOlderThan.mockResolvedValue(4);
    const date = new Date(1);

    expect(await service.deleteOlderThan(date)).toBe(4);
    expect(repository.deleteOlderThan).toHaveBeenCalledWith(date);
  });
});
