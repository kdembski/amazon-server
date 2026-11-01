import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { AmazonCountryOutlierChannelReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierChannelReportRepository";
import { prisma } from "../../../../../support/integration/db";
import { seedAd, seedAmazonCountry, seedCountry } from "../../../../../support/integration/seed";

const repository = new AmazonCountryOutlierChannelReportRepository(prisma);

describe("AmazonCountryOutlierChannelReportRepository (MySQL)", () => {
  it("stores the reported price per ad, country and channel and replaces it on the next set", async () => {
    const ad = await seedAd();
    const pl = await seedCountry({ code: "pl" });
    const de = await seedCountry({ code: "de" });
    await seedAmazonCountry({ countryId: pl.id });
    await seedAmazonCountry({ countryId: de.id });

    expect(await repository.getValue(ad.id, pl.id, 1)).toBeUndefined();

    await repository.set(ad.id, pl.id, 1, new Decimal(19.9));
    await repository.set(ad.id, pl.id, 2, new Decimal(30));
    await repository.set(ad.id, de.id, 1, new Decimal(5));
    await repository.set(ad.id, pl.id, 1, new Decimal(17.5));

    expect((await repository.getValue(ad.id, pl.id, 1))?.toNumber()).toBe(17.5);
    expect((await repository.getValue(ad.id, pl.id, 2))?.toNumber()).toBe(30);
    expect((await repository.getValue(ad.id, de.id, 1))?.toNumber()).toBe(5);
  });

  it("drops the reported prices of a deleted channel", async () => {
    const ad = await seedAd();
    const { countryId } = await seedAmazonCountry();
    await repository.set(ad.id, countryId, 1, new Decimal(10));

    await prisma.discordChannel.delete({ where: { id: 1 } });

    expect(await repository.getValue(ad.id, countryId, 1)).toBeUndefined();
  });
});
