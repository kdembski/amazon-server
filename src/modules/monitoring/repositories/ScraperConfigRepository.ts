import { PrismaClient } from "@@prisma/PrismaClient";

export class ScraperConfigRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.scraperConfig;
  }

  getOrCreate(scraper: string) {
    return this.delegate.upsert({
      where: { scraper },
      create: { scraper },
      update: {},
      select: { concurrency: true, rps: true, batchSize: true },
    });
  }

  findAll() {
    return this.delegate.findMany({ select: { scraper: true, concurrency: true, rps: true } });
  }
}
