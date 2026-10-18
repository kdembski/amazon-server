import { describe, expect, it } from "vitest";
import { CurrencyExchangeRateRepository } from "@/modules/currency/repositories/CurrencyExchangeRateRepository";
import { prisma } from "../../../../support/integration/db";
import { seedCurrency, seedPln, seedRate } from "../../../../support/integration/seed";

const repository = new CurrencyExchangeRateRepository(prisma);
const byCode = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]);

describe("CurrencyExchangeRateRepository (MySQL)", () => {
  it("getByTargetCode returns rates into that currency with both sides loaded", async () => {
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    const sek = await seedCurrency({ code: "SEK" });
    await seedRate({ sourceId: eur.id, targetId: pln.id, value: 4.3 });
    await seedRate({ sourceId: sek.id, targetId: pln.id, value: 0.4 });
    await seedRate({ sourceId: pln.id, targetId: eur.id, value: 0.23 });

    const rates = await repository.getByTargetCode("PLN");

    const pairs: [string, number][] = rates.map((r) => [r.source.code, r.value.toNumber()]);
    expect(pairs.sort(byCode)).toEqual([
      ["EUR", 4.3],
      ["SEK", 0.4],
    ]);
    expect(rates[0].target.code).toBe("PLN");
    expect(await repository.getByTargetCode("USD")).toEqual([]);
  });

  it("updateBySourceAndTarget uses the composite key", async () => {
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    const rate = await seedRate({ sourceId: eur.id, targetId: pln.id, value: 4.3 });
    const ids = { sourceId: eur.id, targetId: pln.id };

    await repository.updateBySourceAndTarget(ids, { value: 4.5 });

    expect((await repository.getById(rate.id))?.value.toString()).toBe("4.5");
  });

  it("rejects a duplicate source/target pair with P2002", async () => {
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    await seedRate({ sourceId: eur.id, targetId: pln.id });

    await expect(seedRate({ sourceId: eur.id, targetId: pln.id })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("delete removes the rate", async () => {
    const rate = await seedRate();

    await repository.delete(rate.id);

    expect(await repository.getById(rate.id)).toBeNull();
  });
});
