import { describe, expect, it } from "vitest";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";
import { fakePrisma } from "../../../support/fakes";

describe("SearchRuleRepository", () => {
  it("reads by id and all", async () => {
    const db = fakePrisma();
    const repository = new SearchRuleRepository(db.prisma);

    await repository.getById(1);
    await repository.getAll();

    expect(db.searchRule.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(db.searchRule.findMany).toHaveBeenCalledWith();
  });
});
