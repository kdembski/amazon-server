import { describe, expect, it, vi } from "vitest";
import { AmazonAdScrapingService } from "@/modules/marketplaces/amazon/services/AmazonAdScrapingService";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import { Mutex } from "@/shared/utils/Mutex";
import { deferred } from "../../../../../support/fakes";

type ScrapAd = { id: number; asin: string; name: string };

const setup = () => {
  const repository = {
    getForScraping: vi.fn().mockResolvedValue([]),
    updateScrapedAt: vi.fn().mockResolvedValue(0),
  };
  const missingService = { getCountryIdsByAd: vi.fn().mockResolvedValue({}) };
  const service = new AmazonAdScrapingService(
    repository as unknown as AmazonAdRepository,
    missingService as unknown as AmazonAdMissingService,
    new Mutex()
  );
  return { service, repository, missingService };
};

describe("AmazonAdScrapingService", () => {
  it("fetches matching ads, bumps scrapedAt and adds the countries to skip", async () => {
    const { service, repository, missingService } = setup();
    const ads: ScrapAd[] = [
      { id: 10, asin: "A", name: "Drill" },
      { id: 11, asin: "B", name: "Saw" },
    ];
    repository.getForScraping.mockResolvedValue(ads);
    missingService.getCountryIdsByAd.mockResolvedValue({ 10: [3, 4] });

    const result = await service.getForScraping(2);

    expect(repository.getForScraping).toHaveBeenCalledWith(2);
    expect(repository.updateScrapedAt).toHaveBeenCalledWith([10, 11]);
    expect(missingService.getCountryIdsByAd).toHaveBeenCalledWith([10, 11]);
    expect(result).toEqual([
      { id: 10, asin: "A", name: "Drill", skipCountryIds: [3, 4] },
      { id: 11, asin: "B", name: "Saw", skipCountryIds: [] },
    ]);
  });

  it("starts a concurrent call only after the one in flight stamped its ads", async () => {
    const { service, repository } = setup();
    const first = deferred<ScrapAd[]>();
    repository.getForScraping.mockReturnValueOnce(first.promise).mockResolvedValue([]);

    const call1 = service.getForScraping(1);
    const call2 = service.getForScraping(1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(repository.getForScraping).toHaveBeenCalledTimes(1);

    first.resolve([]);
    await call1;
    await call2;
    expect(repository.getForScraping).toHaveBeenCalledTimes(2);
  });

  it("serves the next call after one that threw", async () => {
    const { service, repository } = setup();
    repository.getForScraping.mockRejectedValueOnce(new Error("db down")).mockResolvedValue([]);

    await expect(service.getForScraping(1)).rejects.toThrow("db down");
    expect(await service.getForScraping(1)).toEqual([]);
  });
});
