import { describe, expect, it, vi } from "vitest";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CurrencyExchangeRateRepository } from "@/repositories/currency/CurrencyExchangeRateRepository";

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getBySourceAndTarget: vi.fn().mockResolvedValue(null),
    getByTarget: vi.fn().mockResolvedValue([]),
    getByTargetCode: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    updateBySourceAndTarget: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new CurrencyExchangeRateService(
    repository as unknown as CurrencyExchangeRateRepository
  );
  return { service, repository };
};

describe("CurrencyExchangeRateService", () => {
  it("delegates reads", async () => {
    const { service, repository } = setup();
    await service.getBySourceAndTarget({ sourceId: 1, targetId: 2 });
    await service.getByTarget(2);
    await service.getByTargetCode("PLN");
    expect(repository.getBySourceAndTarget).toHaveBeenCalledWith({
      sourceId: 1,
      targetId: 2,
    });
    expect(repository.getByTarget).toHaveBeenCalledWith(2);
    expect(repository.getByTargetCode).toHaveBeenCalledWith("PLN");
  });

  it("updateBySourceAndTarget maps the dto with the update mapper", async () => {
    const { service, repository } = setup();
    await service.updateBySourceAndTarget(
      { sourceId: 1, targetId: 2 },
      { value: 4.1 }
    );
    expect(repository.updateBySourceAndTarget).toHaveBeenCalledWith(
      { sourceId: 1, targetId: 2 },
      expect.objectContaining({ value: 4.1, updatedAt: expect.any(Date) })
    );
  });

  it("wires creatable, updatable and deletable to the repository", async () => {
    const { service, repository } = setup();
    await service.creatable.create({ value: 4, sourceId: 1, targetId: 2 });
    await service.updatable.update(3, { value: 5 });
    await service.deletable.delete(3);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ value: 4, createdAt: expect.any(Date) })
    );
    expect(repository.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ value: 5, updatedAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(3);
  });
});
