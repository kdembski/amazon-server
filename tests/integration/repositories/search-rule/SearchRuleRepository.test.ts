import { describe, expect, it } from "vitest";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";
import { prisma } from "../../../support/integration/db";
import { seedSearchRule } from "../../../support/integration/seed";

const repository = new SearchRuleRepository(prisma);

describe("SearchRuleRepository (MySQL)", () => {
  it("getByValue finds by the unique value and the value cannot repeat", async () => {
    const searchRule = await seedSearchRule({ value: "used" });

    expect((await repository.getByValue("used"))?.id).toBe(searchRule.id);
    expect(await repository.getByValue("new")).toBeNull();
    await expect(seedSearchRule({ value: "used" })).rejects.toMatchObject({ code: "P2002" });
  });

  it("getAll lists everything and delete removes one", async () => {
    const a = await seedSearchRule();
    const b = await seedSearchRule();

    await repository.delete(a.id);

    expect((await repository.getAll()).map((k) => k.id)).toEqual([b.id]);
  });
});
