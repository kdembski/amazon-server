import { describe, expect, it } from "vitest";
import { CurrencyRepository } from "@/modules/currency/repositories/CurrencyRepository";
import { prisma } from "../../../../support/integration/db";
import { seedCurrency } from "../../../../support/integration/seed";

const repository = new CurrencyRepository(prisma);

describe("CurrencyRepository (MySQL)", () => {
  it("rejects a duplicate code with P2002", async () => {
    await seedCurrency({ code: "EUR" });

    await expect(seedCurrency({ code: "EUR" })).rejects.toMatchObject({ code: "P2002" });
  });

  it("getAll, update and delete round-trip", async () => {
    const eur = await seedCurrency({ code: "EUR" });

    await repository.update(eur.id, { symbol: "€" });
    expect((await repository.getAll()).map((c) => [c.id, c.symbol])).toEqual([[eur.id, "€"]]);

    await repository.delete(eur.id);
    expect(await repository.getById(eur.id)).toBeNull();
  });
});
