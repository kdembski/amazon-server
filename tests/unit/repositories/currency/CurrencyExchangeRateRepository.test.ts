import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { CurrencyExchangeRateRepository } from "@/repositories/currency/CurrencyExchangeRateRepository";
import { fakePrisma } from "../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new CurrencyExchangeRateRepository(db.prisma),
    delegate: db.currencyExchangeRate,
  };
};

// CurrencyExchangeRateSelectDto is derived from this select; keep it in sync.
const select = {
  id: true,
  sourceId: true,
  targetId: true,
  value: true,
  createdAt: true,
  updatedAt: true,
  source: true,
  target: true,
};

describe("CurrencyExchangeRateRepository", () => {
  it("reads with source and target included", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getBySourceAndTarget({ sourceId: 1, targetId: 2 });
    await repository.getByTarget(2);
    await repository.getByTargetCode("PLN");

    expect(delegate.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      select,
    });
    expect(delegate.findUnique).toHaveBeenNthCalledWith(2, {
      where: { sourceId_targetId: { sourceId: 1, targetId: 2 } },
      select,
    });
    expect(delegate.findMany).toHaveBeenNthCalledWith(1, {
      where: { targetId: 2 },
      select,
    });
    expect(delegate.findMany).toHaveBeenNthCalledWith(2, {
      where: { target: { code: "PLN" } },
      select,
    });
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { value: 4 } as Prisma.CurrencyExchangeRateCreateInput;

    await repository.create(data);
    await repository.update(2, { value: 5 });
    await repository.updateBySourceAndTarget(
      { sourceId: 1, targetId: 2 },
      { value: 6 }
    );
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { value: 5 },
    });
    expect(delegate.update).toHaveBeenNthCalledWith(2, {
      where: { sourceId_targetId: { sourceId: 1, targetId: 2 } },
      data: { value: 6 },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
