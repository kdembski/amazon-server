import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";
import { fakePrisma } from "../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new SearchRuleRepository(db.prisma),
    delegate: db.searchRule,
  };
};

describe("SearchRuleRepository", () => {
  it("reads by id, value and all", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getByValue("used");
    await repository.getAll();

    expect(delegate.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 1 } });
    expect(delegate.findUnique).toHaveBeenNthCalledWith(2, {
      where: { value: "used" },
    });
    expect(delegate.findMany).toHaveBeenCalledWith();
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { value: "used" } as Prisma.SearchRuleCreateInput;

    await repository.create(data);
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
