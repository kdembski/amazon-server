import { describe, expect, it } from "vitest";
import { AmazonCountryRouteRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRouteRepository";
import { prisma } from "../../../../../support/integration/db";
import { seedAmazonCountry, seedAmazonCountryRoute } from "../../../../../support/integration/seed";

const repository = new AmazonCountryRouteRepository(prisma);

describe("AmazonCountryRouteRepository (MySQL)", () => {
  it("getAll orders by country, then highest priority first", async () => {
    const pl = await seedAmazonCountry();
    const de = await seedAmazonCountry();
    const deLow = await seedAmazonCountryRoute({ countryId: de.countryId, priority: 1 });
    const deHigh = await seedAmazonCountryRoute({ countryId: de.countryId, priority: 3 });
    const plOnly = await seedAmazonCountryRoute({ countryId: pl.countryId, priority: 0 });

    const ids = (await repository.getAll()).map((route) => route.id);

    expect(ids).toEqual([plOnly.id, deHigh.id, deLow.id]);
  });

  it("rejects a second route with the same country and priority with P2002", async () => {
    const { countryId } = await seedAmazonCountryRoute({ priority: 2 });

    await expect(seedAmazonCountryRoute({ countryId, priority: 2 })).rejects.toMatchObject({ code: "P2002" });
  });

  it("updates and deletes by id", async () => {
    const route = await seedAmazonCountryRoute();

    await repository.update(route.id, { maxAttempts: 9 });
    expect((await prisma.amazonCountryRoute.findUniqueOrThrow({ where: { id: route.id } })).maxAttempts).toBe(9);

    await repository.delete(route.id);
    expect(await prisma.amazonCountryRoute.count()).toBe(0);
  });

  it("is deleted together with its country", async () => {
    const route = await seedAmazonCountryRoute();

    await prisma.amazonCountry.delete({ where: { countryId: route.countryId } });

    expect(await prisma.amazonCountryRoute.count()).toBe(0);
  });
});
