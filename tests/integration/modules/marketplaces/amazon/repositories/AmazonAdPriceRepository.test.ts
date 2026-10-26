import { describe, expect, it } from "vitest";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { FIXED_DATE } from "../../../../../support/factories";
import { prisma } from "../../../../../support/integration/db";
import { seedAd, seedAmazonCountry, seedCountry, seedPrice } from "../../../../../support/integration/seed";

const repository = new AmazonAdPriceRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);

describe("AmazonAdPriceRepository (MySQL)", () => {
  it("getRecentByAd groups the newest prices per country, newest first", async () => {
    const ad = await seedAd();
    const pl = await seedCountry({ code: "pl" });
    const de = await seedCountry({ code: "de" });
    const se = await seedCountry({ code: "se" });
    await seedAmazonCountry({ countryId: pl.id, tld: "pl", active: false });
    await seedAmazonCountry({ countryId: de.id });
    await seedAmazonCountry({ countryId: se.id });
    const rows: [number, number, number][] = [
      [se.id, 30, 1],
      [pl.id, 10, 1],
      [pl.id, 11, 2],
      [de.id, 20, 3],
      [pl.id, 12, 4],
      [de.id, 21, 5],
      [pl.id, 13, 6],
    ];
    for (const [countryId, value, at] of rows) {
      await seedPrice({ adId: ad.id, countryId, value, createdAt: minute(at) });
    }

    const groups = await repository.getRecentByAd(ad.id, 3);

    expect(groups.map((group) => group.map((p) => p.value.toNumber()))).toEqual([
      [13, 12, 11],
      [21, 20],
      [30],
    ]);
    expect(groups[0][0].country).toMatchObject({
      tld: "pl",
      active: false,
      country: {
        id: pl.id,
        code: "pl",
        currencyId: pl.currencyId,
        currency: { id: pl.currencyId },
      },
    });
    for (const price of groups.flat()) {
      expect(price).toEqual(await repository.getById(price.id));
    }
  });

  it("getRecentByAd ignores other ads", async () => {
    const ad = await seedAd();
    const otherAd = await seedAd();
    const { countryId } = await seedAmazonCountry();
    await seedPrice({ adId: ad.id, countryId, value: 1, createdAt: minute(1) });
    await seedPrice({ adId: otherAd.id, countryId, value: 3, createdAt: minute(1) });

    const groups = await repository.getRecentByAd(ad.id);

    expect(groups.map((group) => group.map((p) => p.value.toNumber()))).toEqual([[1]]);
  });

  it("stores Decimal(9,2) exactly and rounds extra fractional digits", async () => {
    const exact = await seedPrice({ value: "1234567.89" });
    const rounded = await seedPrice({ value: "10.005" });

    expect((await repository.getById(exact.id))?.value.toString()).toBe("1234567.89");
    expect((await repository.getById(rounded.id))?.value.toString()).toBe("10.01");
  });

  it("getById returns null for a missing id and update/delete work", async () => {
    expect(await repository.getById(999)).toBeNull();
    const price = await seedPrice({ value: 5 });

    await repository.update(price.id, { value: 7.5 });
    expect((await repository.getById(price.id))?.value.toString()).toBe("7.5");

    await repository.delete(price.id);
    expect(await prisma.amazonAdPrice.count()).toBe(0);
  });

  it("createMany stores all prices, or none when a row is invalid", async () => {
    const ad = await seedAd();
    const { countryId } = await seedAmazonCountry();
    const price = { adId: ad.id, countryId, value: 5, createdAt: FIXED_DATE, updatedAt: FIXED_DATE };

    expect(await repository.createMany([price, { ...price, value: 6 }])).toBe(2);
    await expect(
      repository.createMany([price, { ...price, countryId: 999 }])
    ).rejects.toMatchObject({ code: "P2003" });

    expect(await prisma.amazonAdPrice.count()).toBe(2);
  });
});
