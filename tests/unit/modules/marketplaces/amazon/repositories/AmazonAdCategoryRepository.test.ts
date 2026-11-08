import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdCategoryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdCategoryRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonAdCategoryRepository(db.prisma),
    delegate: db.amazonAdCategory,
  };
};

describe("AmazonAdCategoryRepository", () => {
  it("reads by id and all", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getAll();

    expect(delegate.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(delegate.findMany).toHaveBeenCalledWith();
  });

  it("getForScraping picks the active category with the oldest scrapedAt, nulls first", async () => {
    const { repository, delegate } = setup();

    await repository.getForScraping();

    expect(delegate.findFirstOrThrow).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { scrapedAt: { sort: "asc", nulls: "first" } },
    });
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { name: "tools" } as Prisma.AmazonAdCategoryCreateInput;

    await repository.create(data);
    await repository.update(2, { name: "x" });
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { name: "x" },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it("getActiveIds returns the ids of active categories", async () => {
    const { repository, delegate } = setup();
    delegate.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);

    expect(await repository.getActiveIds()).toEqual([1, 3]);
    expect(delegate.findMany).toHaveBeenCalledWith({ where: { active: true }, select: { id: true } });
  });

  it("upsertByName creates a missing category and keeps an existing one", async () => {
    const { repository, delegate } = setup();
    delegate.upsert.mockResolvedValue({ id: 4 });

    expect(await repository.upsertByName("Books")).toEqual({ id: 4 });
    expect(delegate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: "Books" }, update: {} })
    );
  });
});
