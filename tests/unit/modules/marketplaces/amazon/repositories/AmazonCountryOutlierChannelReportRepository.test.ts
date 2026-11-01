import { afterEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { AmazonCountryOutlierChannelReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierChannelReportRepository";
import { FIXED_DATE } from "../../../../../support/factories";
import { fakePrisma } from "../../../../../support/fakes";

afterEach(() => {
  vi.useRealTimers();
});

describe("AmazonCountryOutlierChannelReportRepository", () => {
  it("getValue returns the reported price of the ad, country and channel", async () => {
    const db = fakePrisma();
    db.amazonCountryOutlierChannelReport.findUnique.mockResolvedValue({ value: new Decimal(9.99) });
    const repository = new AmazonCountryOutlierChannelReportRepository(db.prisma);

    expect(await repository.getValue(1, 2, 3)).toEqual(new Decimal(9.99));
    expect(db.amazonCountryOutlierChannelReport.findUnique).toHaveBeenCalledWith({
      where: { adId_countryId_channelId: { adId: 1, countryId: 2, channelId: 3 } },
      select: { value: true },
    });
  });

  it("getValue returns undefined for an ad never reported on the channel", async () => {
    const db = fakePrisma();
    db.amazonCountryOutlierChannelReport.findUnique.mockResolvedValue(null);
    const repository = new AmazonCountryOutlierChannelReportRepository(db.prisma);

    expect(await repository.getValue(1, 2, 3)).toBeUndefined();
  });

  it("set upserts the reported price with timestamps", async () => {
    vi.useFakeTimers({ now: FIXED_DATE });
    const db = fakePrisma();
    const repository = new AmazonCountryOutlierChannelReportRepository(db.prisma);
    const value = new Decimal(9.99);

    await repository.set(1, 2, 3, value);

    expect(db.amazonCountryOutlierChannelReport.upsert).toHaveBeenCalledWith({
      where: { adId_countryId_channelId: { adId: 1, countryId: 2, channelId: 3 } },
      create: {
        adId: 1,
        countryId: 2,
        channelId: 3,
        value,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      },
      update: { value, updatedAt: FIXED_DATE },
    });
  });
});
