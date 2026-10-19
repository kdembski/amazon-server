import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonSearchRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonSearchRuleRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonSearchRuleRepository(db.prisma),
    delegate: db.amazonSearchRule,
  };
};

describe("AmazonSearchRuleRepository", () => {
  it("reads by id and all in id order", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getAll();

    expect(delegate.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(delegate.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = {
      value: "sony",
      categoryId: 2,
      createdAt: new Date(),
    } as Prisma.AmazonSearchRuleUncheckedCreateInput;

    await repository.create(data);
    await repository.update(3, { categoryId: null });
    await repository.delete(4);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { categoryId: null },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });
});
