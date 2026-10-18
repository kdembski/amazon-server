import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { CurrencyExchangeRateRepository } from "@/modules/currency/repositories/CurrencyExchangeRateRepository";
import { PlnExchangeRateCache } from "@/modules/currency/services/PlnExchangeRateCache";
import { buildRate } from "../../../../support/factories";
import { resetSingleton } from "../../../../support/fakes";

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
  afterEach(() => resetSingleton(PlnExchangeRateCache));

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

  it("getPlnRates fetches once and serves the cache afterwards", async () => {
    const { service, repository } = setup();
    const rates = [buildRate()];
    repository.getByTargetCode.mockResolvedValue(rates);

    const first = await service.getPlnRates();
    const second = await service.getPlnRates();

    expect(first).toBe(rates);
    expect(second).toBe(rates);
    expect(repository.getByTargetCode).toHaveBeenCalledTimes(1);
    expect(repository.getByTargetCode).toHaveBeenCalledWith("PLN");
  });

  it("refreshPlnRates replaces the cached rates", async () => {
    const { service, repository } = setup();
    const oldRates = [buildRate({ value: 4 })];
    const newRates = [buildRate({ value: 5 })];
    repository.getByTargetCode.mockResolvedValue(oldRates);
    await service.getPlnRates();
    repository.getByTargetCode.mockResolvedValue(newRates);

    await service.refreshPlnRates();

    expect(await service.getPlnRates()).toBe(newRates);
    expect(repository.getByTargetCode).toHaveBeenCalledTimes(2);
  });

  it("refreshPlnRates is visible to another service instance", async () => {
    const a = setup();
    const b = setup();
    const rates = [buildRate()];
    a.repository.getByTargetCode.mockResolvedValue(rates);

    await a.service.refreshPlnRates();

    expect(await b.service.getPlnRates()).toBe(rates);
    expect(b.repository.getByTargetCode).not.toHaveBeenCalled();
  });
});
