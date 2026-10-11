import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdCategoryRepository } from "@/repositories/amazon/AmazonAdCategoryRepository";
import { fakePrisma } from "../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonAdCategoryRepository(db.prisma),
    delegate: db.amazonAdCategory,
  };
};

describe("AmazonAdCategoryRepository", () => {
  it("reads by id, name, all and active", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getByName("tools");
    await repository.getAll();
    await repository.getActive();

    expect(delegate.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { name: "tools" } });
    expect(delegate.findMany).toHaveBeenNthCalledWith(1);
    expect(delegate.findMany).toHaveBeenNthCalledWith(2, {
      where: { active: true },
    });
  });

  it("getForScraping picks the category with the oldest scrapedAt, nulls first", async () => {
    const { repository, delegate } = setup();

    await repository.getForScraping();

    expect(delegate.findFirstOrThrow).toHaveBeenCalledWith({
      orderBy: { scrapedAt: { sort: "asc", nulls: "first" } },
    });
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { name: "tools" } as Prisma.AmazonAdCategoryCreateInput;

    await repository.create(data);
    await repository.update(2, { name: "x" });
    await repository.updateActive(2, true);
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { name: "x" },
    });
    expect(delegate.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { active: true },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
