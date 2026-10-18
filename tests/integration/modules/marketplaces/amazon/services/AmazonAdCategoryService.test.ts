import { describe, expect, it } from "vitest";
import { AmazonAdCategoryService } from "@/modules/marketplaces/amazon/services/AmazonAdCategoryService";
import { FIXED_DATE } from "../../../../../support/factories";
import { prisma } from "../../../../../support/integration/db";
import { seedCategory } from "../../../../../support/integration/seed";

const service = new AmazonAdCategoryService();

describe("AmazonAdCategoryService (MySQL)", () => {
  it("hands out the never scraped category first and stamps scrapedAt", async () => {
    const scraped = await seedCategory({ scrapedAt: FIXED_DATE });
    const fresh = await seedCategory({ scrapedAt: null });

    const first = await service.getForScraping();

    expect(first.id).toBe(fresh.id);
    const stamped = await prisma.amazonAdCategory.findUniqueOrThrow({ where: { id: fresh.id } });
    expect(stamped.scrapedAt).toBeInstanceOf(Date);
    expect(stamped.scrapedAt!.getTime()).toBeGreaterThan(FIXED_DATE.getTime());

    const second = await service.getForScraping();

    expect(second.id).toBe(scraped.id);
  });

  it("rejects with P2025 when there are no categories", async () => {
    await expect(service.getForScraping()).rejects.toMatchObject({ code: "P2025" });
  });
});
