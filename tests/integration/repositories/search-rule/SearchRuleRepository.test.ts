import { describe, expect, it } from "vitest";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";
import { prisma } from "../../../support/integration/db";
import { seedSearchRule } from "../../../support/integration/seed";

const repository = new SearchRuleRepository(prisma);

describe("SearchRuleRepository (MySQL)", () => {
  it("rejects a repeated value with P2002", async () => {
    await seedSearchRule({ value: "x" });

    await expect(seedSearchRule({ value: "x" })).rejects.toMatchObject({ code: "P2002" });
  });

  it("getById finds one rule and getAll lists everything", async () => {
    const a = await seedSearchRule();
    const b = await seedSearchRule();

    expect((await repository.getById(a.id))?.id).toBe(a.id);
    expect(await repository.getById(999)).toBeNull();
    expect((await repository.getAll()).map((k) => k.id).sort((x, y) => x - y)).toEqual(
      [a.id, b.id].sort((x, y) => x - y)
    );
  });
});
