import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "@@prisma/PrismaClient";

export class AmazonCountryOutlierChannelReportRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonCountryOutlierChannelReport;
  }

  async getValue(adId: number, countryId: number, channelId: number) {
    const row = await this.delegate.findUnique({
      where: { adId_countryId_channelId: { adId, countryId, channelId } },
      select: { value: true },
    });
    return row?.value;
  }

  async set(adId: number, countryId: number, channelId: number, value: Decimal) {
    const now = new Date(Date.now());
    await this.delegate.upsert({
      where: { adId_countryId_channelId: { adId, countryId, channelId } },
      create: { adId, countryId, channelId, value, createdAt: now, updatedAt: now },
      update: { value, updatedAt: now },
    });
  }
}
