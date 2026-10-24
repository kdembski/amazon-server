import { describe, expect, it } from "vitest";
import { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";
import { fakePrisma } from "../../../../support/fakes";

describe("ScraperConfigRepository", () => {
  it("getOrCreate upserts the scraper row and returns its config", async () => {
    const db = fakePrisma();
    const config = { concurrency: 150, rps: 150, batchSize: 5000 };
    db.scraperConfig.upsert.mockResolvedValue(config);
    const repository = new ScraperConfigRepository(db.prisma);

    expect(await repository.getOrCreate("amazon-pdp-1")).toEqual(config);

    expect(db.scraperConfig.upsert).toHaveBeenCalledWith({
      where: { scraper: "amazon-pdp-1" },
      create: { scraper: "amazon-pdp-1" },
      update: {},
      select: { concurrency: true, rps: true, batchSize: true },
    });
  });
});
