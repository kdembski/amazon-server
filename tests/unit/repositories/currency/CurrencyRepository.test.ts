import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { CurrencyRepository } from "@/repositories/currency/CurrencyRepository";
import { fakePrisma } from "../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new CurrencyRepository(db.prisma), delegate: db.currency };
};

describe("CurrencyRepository", () => {
  it("reads by id, code and all", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getByCode("EUR");
    await repository.getAll();

    expect(delegate.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 1 } });
    expect(delegate.findUnique).toHaveBeenNthCalledWith(2, {
      where: { code: "EUR" },
    });
    expect(delegate.findMany).toHaveBeenCalledWith();
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { code: "EUR" } as Prisma.CurrencyCreateInput;

    await repository.create(data);
    await repository.update(2, { symbol: "€" });
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { symbol: "€" },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
