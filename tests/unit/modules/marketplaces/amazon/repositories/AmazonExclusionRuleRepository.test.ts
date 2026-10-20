import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonExclusionRuleRepository(db.prisma),
    delegate: db.amazonExclusionRule,
    $transaction: db.$transaction,
  };
};

describe("AmazonExclusionRuleRepository", () => {
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
    } as Prisma.AmazonExclusionRuleUncheckedCreateInput;

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

describe("AmazonExclusionRuleRepository.applyBatch", () => {
  it("deletes, updates and then creates in one transaction", async () => {
    const { repository, delegate, $transaction } = setup();
    const order: string[] = [];
    delegate.delete.mockImplementation(() => order.push("delete"));
    delegate.update.mockImplementation(() => order.push("update"));
    delegate.create.mockImplementation(() => order.push("create"));
    const data = { value: "sony", createdAt: new Date() };

    await repository.applyBatch({
      create: [data],
      update: [{ id: 3, data: { categoryId: 2 } }],
      delete: [4],
    });

    expect(order).toEqual(["delete", "update", "create"]);
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 4 } });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { categoryId: 2 },
    });
    expect(delegate.create).toHaveBeenCalledWith({ data });
  });
});
