import { describe, expect, it, vi } from "vitest";
import { CurrencyService } from "@/services/currency/CurrencyService";
import { CurrencyRepository } from "@/repositories/currency/CurrencyRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getByCode: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new CurrencyService(
    repository as unknown as CurrencyRepository
  );
  return { service, repository };
};

describe("CurrencyService", () => {
  it("delegates getAll and getByCode", async () => {
    const { service, repository } = setup();
    await service.getAll();
    await service.getByCode("EUR");
    expect(repository.getAll).toHaveBeenCalled();
    expect(repository.getByCode).toHaveBeenCalledWith("EUR");
  });

  it("wires creatable, updatable and deletable to the repository", async () => {
    const { service, repository } = setup();
    await service.creatable.create({ name: "Euro", code: "EUR", symbol: "€" });
    await service.updatable.update(1, { name: "Euro", code: "EUR", symbol: "€" });
    await service.deletable.delete(1);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: "EUR", createdAt: expect.any(Date) })
    );
    expect(repository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ symbol: "€", updatedAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(1);
  });
});
