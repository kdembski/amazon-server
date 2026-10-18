import { describe, expect, it } from "vitest";
import { CountryRepository } from "@/repositories/currency/CountryRepository";
import { prisma } from "../../../support/integration/db";
import { seedCountry, seedCurrency } from "../../../support/integration/seed";

const repository = new CountryRepository(prisma);

describe("CountryRepository (MySQL)", () => {
  it("update changes the currency through the relation", async () => {
    const country = await seedCountry();
    const eur = await seedCurrency({ code: "EUR" });

    await repository.update(country.id, { currency: { connect: { id: eur.id } } });

    expect((await repository.getById(country.id))?.currencyId).toBe(eur.id);
  });

  it("deleting the currency cascades to its countries", async () => {
    const currency = await seedCurrency();
    await seedCountry({ currencyId: currency.id });

    await prisma.currency.delete({ where: { id: currency.id } });

    expect(await repository.getAll()).toEqual([]);
  });
});
