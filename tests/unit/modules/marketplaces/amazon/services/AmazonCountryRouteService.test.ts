import { describe, expect, it, vi } from "vitest";
import { AmazonCountryRouteService } from "@/modules/marketplaces/amazon/services/AmazonCountryRouteService";
import { AmazonCountryRouteRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRouteRepository";

const setup = () => {
  const repository = {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new AmazonCountryRouteService(repository as unknown as AmazonCountryRouteRepository);
  return { service, repository };
};

const route = { priority: 3, proxyType: "direct", pdpSource: "aod", maxAttempts: 6 };

describe("AmazonCountryRouteService", () => {
  it("delegates getAll", async () => {
    const { service, repository } = setup();

    await service.getAll();

    expect(repository.getAll).toHaveBeenCalled();
  });

  it("wires creatable, updatable and deletable to the repository", async () => {
    const { service, repository } = setup();

    await service.creatable.create({ countryId: 2, ...route });
    await service.updatable.update(5, route);
    await service.deletable.delete(5);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ countryId: 2, ...route }));
    expect(repository.update).toHaveBeenCalledWith(5, expect.objectContaining(route));
    expect(repository.delete).toHaveBeenCalledWith(5);
  });

  it("rejects an invalid route before touching the repository", () => {
    const { service, repository } = setup();

    expect(() => service.creatable.create({ countryId: 2, ...route, pdpSource: "twister,awd" })).toThrow(
      expect.objectContaining({ status: 400 })
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
