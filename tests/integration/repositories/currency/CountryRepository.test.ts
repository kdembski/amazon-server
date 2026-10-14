import { describe, expect, it } from "vitest";
import { CountryRepository } from "@/repositories/currency/CountryRepository";
import { prisma } from "../../../support/integration/db";
import { seedCountry, seedCurrency } from "../../../support/integration/seed";

const repository = new CountryRepository(prisma);

describe("CountryRepository (MySQL)", () => {
  it("getActive returns only active countries and updateActive flips the flag", async () => {
    const active = await seedCountry({ active: true });
    const inactive = await seedCountry({ active: false });

    expect((await repository.getActive()).map((c) => c.id)).toEqual([active.id]);

    await repository.updateActive(active.id, false);
    await repository.updateActive(inactive.id, true);

    expect((await repository.getActive()).map((c) => c.id)).toEqual([inactive.id]);
  });

  it("getByCode finds by the unique code and the code cannot repeat", async () => {
    const country = await seedCountry({ code: "pl" });

    expect((await repository.getByCode("pl"))?.id).toBe(country.id);
    expect(await repository.getByCode("de")).toBeNull();
    await expect(seedCountry({ code: "pl" })).rejects.toMatchObject({ code: "P2002" });
  });

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
