import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { AmazonCountryOutlierReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierReportRepository";
import { prisma } from "../../../../../support/integration/db";
import { seedAd, seedAmazonCountry, seedCountry } from "../../../../../support/integration/seed";

const repository = new AmazonCountryOutlierReportRepository(prisma);

describe("AmazonCountryOutlierReportRepository (MySQL)", () => {
  it("stores the reported price per ad and country and replaces it on the next set", async () => {
    const ad = await seedAd();
    const pl = await seedCountry({ code: "pl" });
    const de = await seedCountry({ code: "de" });
    await seedAmazonCountry({ countryId: pl.id });
    await seedAmazonCountry({ countryId: de.id });

    expect(await repository.getValue(ad.id, pl.id)).toBeUndefined();

    await repository.set(ad.id, pl.id, new Decimal(19.9));
    await repository.set(ad.id, de.id, new Decimal(5));
    await repository.set(ad.id, pl.id, new Decimal(17.5));

    expect((await repository.getValue(ad.id, pl.id))?.toNumber()).toBe(17.5);
    expect((await repository.getValue(ad.id, de.id))?.toNumber()).toBe(5);
  });
});
