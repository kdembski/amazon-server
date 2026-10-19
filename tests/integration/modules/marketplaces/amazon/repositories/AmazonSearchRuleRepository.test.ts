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

  it("applies a batch atomically and lets it replace a rule with the same value", async () => {
    const category = await seedCategory();
    const replaced = await seedAmazonSearchRule({ value: "sony" });
    const moved = await seedAmazonSearchRule({ value: "bose" });

    await repository.applyBatch({
      create: [{ value: "sony", createdAt: new Date() }],
      update: [{ id: moved.id, data: { categoryId: category.id } }],
      delete: [replaced.id],
    });

    const rules = await repository.getAll();
    expect(rules.map(({ value, categoryId }) => [value, categoryId])).toEqual([
      ["bose", category.id],
      ["sony", null],
    ]);
  });

  it("rolls the whole batch back when one write fails", async () => {
    const rule = await seedAmazonSearchRule({ value: "sony" });

    await expect(
      repository.applyBatch({
        create: [{ value: "bose", createdAt: new Date() }],
        update: [{ id: rule.id, data: { value: "jbl" } }],
        delete: [rule.id + 1000],
      })
    ).rejects.toMatchObject({ code: "P2025" });

    expect(await repository.getAll()).toEqual([rule]);
  });
});
