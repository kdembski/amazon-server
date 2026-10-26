import { describe, expect, it, vi } from "vitest";
import { AmazonCountryService } from "@/modules/marketplaces/amazon/services/AmazonCountryService";
import { AmazonCountryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getForScraping: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  };
  const service = new AmazonCountryService(
    repository as unknown as AmazonCountryRepository
  );
  return { service, repository };
};

describe("AmazonCountryService", () => {
  it("delegates getAll and getForScraping", async () => {
    const { service, repository } = setup();
    await service.getAll();
    await service.getForScraping();
    expect(repository.getAll).toHaveBeenCalled();
    expect(repository.getForScraping).toHaveBeenCalled();
  });

  it("wires creatable and updatable to the repository", async () => {
    const { service, repository } = setup();
    await service.creatable.create({ countryId: 2, tld: "de", scraped: true, active: true, proxyType: "isp", priority: 2 });
    await service.updatable.update(2, { tld: "de", scraped: false, active: false, proxyType: "datacenter", priority: 0 });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ countryId: 2, tld: "de", scraped: true, active: true, proxyType: "isp", priority: 2 })
    );
    expect(repository.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ tld: "de", scraped: false, active: false, proxyType: "datacenter", priority: 0 })
    );
  });
});
