import { describe, expect, it, vi } from "vitest";
import { CountryService } from "@/modules/currency/services/CountryService";
import { CountryRepository } from "@/modules/currency/repositories/CountryRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new CountryService(repository as unknown as CountryRepository);
  return { service, repository };
};

describe("CountryService", () => {
  it("delegates getAll", async () => {
    const { service, repository } = setup();
    await service.getAll();
    expect(repository.getAll).toHaveBeenCalled();
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
