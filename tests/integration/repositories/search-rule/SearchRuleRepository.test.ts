import { describe, expect, it } from "vitest";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";
import { prisma } from "../../../support/integration/db";
import { seedSearchRule } from "../../../support/integration/seed";

const repository = new SearchRuleRepository(prisma);

describe("SearchRuleRepository (MySQL)", () => {
  it("getById finds one rule and getAll lists everything", async () => {
    const a = await seedSearchRule();
    const b = await seedSearchRule();

    expect((await repository.getById(a.id))?.id).toBe(a.id);
    expect(await repository.getById(999)).toBeNull();
    expect((await repository.getAll()).map((k) => k.id).sort()).toEqual(
      [a.id, b.id].sort()
    );
  });
});
