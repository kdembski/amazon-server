import { describe, expect, it } from "vitest";
import { AmazonCountryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRepository";
import { prisma } from "../../../../../support/integration/db";
import {
  seedAmazonCountry,
  seedCountry,
  seedPrice,
} from "../../../../../support/integration/seed";

const repository = new AmazonCountryRepository(prisma);

describe("AmazonCountryRepository (MySQL)", () => {
  it("reads and updates by country id", async () => {
    const { countryId } = await seedAmazonCountry({ tld: "be", active: false });

    await repository.update(countryId, { tld: "com.be", active: true });

    expect(await repository.getById(countryId)).toMatchObject({
      countryId,
      tld: "com.be",
      active: true,
    });
    expect(await repository.getAll()).toHaveLength(1);
  });

  it("getForScraping returns the countryId and tld of scraped countries only", async () => {
    const scraped = await seedAmazonCountry({ tld: "de", scraped: true });
    await seedAmazonCountry({ tld: "ie", scraped: false });

    expect(await repository.getForScraping()).toEqual([
      { countryId: scraped.countryId, tld: "de" },
    ]);
  });

  it("rejects a second row for the same country with P2002", async () => {
    const { countryId } = await seedAmazonCountry();

    await expect(seedAmazonCountry({ countryId })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("rejects a price of a country without an Amazon country with P2003", async () => {
    const country = await seedCountry();

    await expect(seedPrice({ countryId: country.id })).rejects.toMatchObject({
      code: "P2003",
    });
  });

  it("deleting the country cascades to its Amazon country and prices", async () => {
    const { countryId } = await seedAmazonCountry();
    await seedPrice({ countryId });

    await prisma.country.delete({ where: { id: countryId } });

    expect(await repository.getAll()).toEqual([]);
    expect(await prisma.amazonAdPrice.count()).toBe(0);
  });
});
