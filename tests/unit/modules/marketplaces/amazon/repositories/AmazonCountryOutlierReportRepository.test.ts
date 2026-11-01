import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { AmazonCountryOutlierReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierReportRepository";
import { fakePrisma } from "../../../../../support/fakes";

describe("AmazonCountryOutlierReportRepository", () => {
  it("getValue returns the reported price of the ad and country", async () => {
    const db = fakePrisma();
    db.amazonCountryOutlierReport.findUnique.mockResolvedValue({ value: new Decimal(9.99) });
    const repository = new AmazonCountryOutlierReportRepository(db.prisma);

    expect(await repository.getValue(1, 2)).toEqual(new Decimal(9.99));
    expect(db.amazonCountryOutlierReport.findUnique).toHaveBeenCalledWith({
      where: { adId_countryId: { adId: 1, countryId: 2 } },
      select: { value: true },
    });
  });

  it("getValue returns undefined for an ad never reported", async () => {
    const db = fakePrisma();
    db.amazonCountryOutlierReport.findUnique.mockResolvedValue(null);
    const repository = new AmazonCountryOutlierReportRepository(db.prisma);

    expect(await repository.getValue(1, 2)).toBeUndefined();
  });

  it("set upserts the reported price", async () => {
    const db = fakePrisma();
    const repository = new AmazonCountryOutlierReportRepository(db.prisma);
    const value = new Decimal(9.99);

    await repository.set(1, 2, value);

    expect(db.amazonCountryOutlierReport.upsert).toHaveBeenCalledWith({
      where: { adId_countryId: { adId: 1, countryId: 2 } },
      create: { adId: 1, countryId: 2, value },
      update: { value },
    });
  });
});
