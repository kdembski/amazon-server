import { describe, expect, it } from "vitest";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { FIXED_DATE } from "../../../../../support/factories";
import { prisma } from "../../../../../support/integration/db";
import { seedAd, seedCountry, seedPrice } from "../../../../../support/integration/seed";

const repository = new AmazonAdPriceRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);

describe("AmazonAdPriceRepository (MySQL)", () => {
  it("getByAdAndCountry returns up to 5 newest prices per country, newest first", async () => {
    const ad = await seedAd();
    const pl = await seedCountry({ code: "pl" });
    const de = await seedCountry({ code: "de" });
    const rows: [number, number, number][] = [
      [pl.id, 10, 1],
      [de.id, 20, 2],
      [pl.id, 11, 3],
      [de.id, 21, 4],
      [pl.id, 12, 5],
      [pl.id, 13, 6],
      [pl.id, 14, 7],
      [pl.id, 15, 8],
    ];
    for (const [countryId, value, at] of rows) {
      await seedPrice({ adId: ad.id, countryId, value, createdAt: minute(at) });
    }

    const groups = await repository.getByAdAndCountry(ad.id, [pl.id, de.id]);

    expect(groups.map((group) => group.map((p) => p.value.toNumber()))).toEqual([
      [15, 14, 13, 12, 11],
      [21, 20],
    ]);
    expect(groups[0][0].country).toMatchObject({
      id: pl.id,
      code: "pl",
      currencyId: pl.currencyId,
      currency: { id: pl.currencyId },
    });
  });

  it("getByAdAndCountry ignores other ads and countries not asked for", async () => {
    const ad = await seedAd();
    const otherAd = await seedAd();
    const pl = await seedCountry({ code: "pl" });
    const de = await seedCountry({ code: "de" });
    await seedPrice({ adId: ad.id, countryId: pl.id, value: 1 });
    await seedPrice({ adId: ad.id, countryId: de.id, value: 2 });
    await seedPrice({ adId: otherAd.id, countryId: pl.id, value: 3 });

    const groups = await repository.getByAdAndCountry(ad.id, [pl.id]);

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
});
