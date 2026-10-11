import { describe, expect, it, vi } from "vitest";
import { CountryService } from "@/services/currency/CountryService";
import { CountryRepository } from "@/repositories/currency/CountryRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getByCode: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    updateActive: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new CountryService(repository as unknown as CountryRepository);
  return { service, repository };
};

describe("CountryService", () => {
  it("delegates reads and updateActive", async () => {
    const { service, repository } = setup();
    await service.getAll();
    await service.getByCode("de");
    await service.getActive();
    await service.updateActive(1, false);
    expect(repository.getAll).toHaveBeenCalled();
    expect(repository.getByCode).toHaveBeenCalledWith("de");
    expect(repository.getActive).toHaveBeenCalled();
    expect(repository.updateActive).toHaveBeenCalledWith(1, false);
  });

  it("wires creatable, updatable and deletable to the repository", async () => {
    const { service, repository } = setup();
    await service.creatable.create({ name: "Germany", code: "de", currencyId: 2 });
    await service.updatable.update(5, { name: "Germany", code: "de", currencyId: 2 });
    await service.deletable.delete(6);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "de",
        currency: { connect: { id: 2 } },
        createdAt: expect.any(Date),
      })
    );
    expect(repository.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ code: "de", updatedAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(6);
  });
});
