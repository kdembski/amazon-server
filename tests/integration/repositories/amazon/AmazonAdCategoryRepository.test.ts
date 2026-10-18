import { describe, expect, it } from "vitest";
import { AmazonAdCategoryRepository } from "@/repositories/amazon/AmazonAdCategoryRepository";
import { FIXED_DATE } from "../../../support/factories";
import { prisma } from "../../../support/integration/db";
import { seedCategory } from "../../../support/integration/seed";

const repository = new AmazonAdCategoryRepository(prisma);
const day = (n: number) => new Date(FIXED_DATE.getTime() + n * 86_400_000);

describe("AmazonAdCategoryRepository (MySQL)", () => {
  it("getForScraping prefers a never scraped category, then the oldest scrapedAt", async () => {
    const oldest = await seedCategory({ scrapedAt: day(0) });
    await seedCategory({ scrapedAt: day(1) });
    const never = await seedCategory({ scrapedAt: null });

    expect((await repository.getForScraping()).id).toBe(never.id);

    await repository.update(never.id, { scrapedAt: day(5) });

    expect((await repository.getForScraping()).id).toBe(oldest.id);
  });

  it("getForScraping skips inactive categories, even never scraped ones", async () => {
    await seedCategory({ active: false, scrapedAt: null });
    const active = await seedCategory({ scrapedAt: day(0) });

    expect((await repository.getForScraping()).id).toBe(active.id);
  });

  it("getForScraping throws P2025 when no category is active", async () => {
    await seedCategory({ active: false });

    await expect(repository.getForScraping()).rejects.toMatchObject({
      code: "P2025",
    });
  });

  it("getForScraping throws P2025 on an empty table", async () => {
    await expect(repository.getForScraping()).rejects.toMatchObject({
      code: "P2025",
    });
  });

  it("rejects a repeated name with P2002", async () => {
    await seedCategory({ name: "audio" });

    await expect(repository.create({ name: "audio" } as never)).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("getById throws P2025 for a missing id and delete cascades to ads", async () => {
    await expect(repository.getById(999)).rejects.toMatchObject({ code: "P2025" });

    const category = await seedCategory();
    await prisma.amazonAd.create({
      data: {
        asin: "B0CASCADE",
        name: "Ad",
        image: "img",
        categoryId: category.id,
        createdAt: FIXED_DATE,
        updatedAt: FIXED_DATE,
      },
    });
    await repository.delete(category.id);

    expect(await prisma.amazonAd.count()).toBe(0);
  });
});
