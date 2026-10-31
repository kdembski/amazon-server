import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "@@prisma/PrismaClient";

export class AmazonCountryOutlierReportRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonCountryOutlierReport;
  }

  async getValue(adId: number, countryId: number) {
    const row = await this.delegate.findUnique({
      where: { adId_countryId: { adId, countryId } },
      select: { value: true },
    });
    return row?.value;
  }

  async set(adId: number, countryId: number, value: Decimal) {
    await this.delegate.upsert({
      where: { adId_countryId: { adId, countryId } },
      create: { adId, countryId, value },
      update: { value },
    });
  }
}
