import { describe, expect, it } from "vitest";
import { AmazonSearchRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonSearchRuleRepository";
import { prisma } from "../../../../../support/integration/db";
import { seedAmazonSearchRule, seedCategory } from "../../../../../support/integration/seed";

const repository = new AmazonSearchRuleRepository(prisma);

describe("AmazonSearchRuleRepository (MySQL)", () => {
  it("deletes the rules of a deleted category", async () => {
    const category = await seedCategory();
    await seedAmazonSearchRule({ value: "sony", categoryId: category.id });
    const global = await seedAmazonSearchRule({ value: "bose" });

    await prisma.amazonAdCategory.delete({ where: { id: category.id } });

    expect(await repository.getAll()).toEqual([global]);
  });

  it("rejects a duplicate (value, categoryId)", async () => {
    const category = await seedCategory();
    const data = { value: "sony", categoryId: category.id, createdAt: new Date() };
    await repository.create(data);

    await expect(repository.create(data)).rejects.toMatchObject({ code: "P2002" });
  });
});
