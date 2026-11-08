import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  const repository = new AmazonAdRepository(db.prisma);
  return {
    repository,
    delegate: db.amazonAd,
    $executeRaw: db.$executeRaw,
  };
};

// AmazonAdSelectDto is derived from this select; keep it in sync on purpose.
const structure = {
  id: true,
  asin: true,
  image: true,
  name: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  scrapedAt: true,
  category: { select: { id: true, name: true, active: true } },
};

describe("AmazonAdRepository", () => {
  it("getById uses findUniqueOrThrow with the full ad structure", async () => {
    const { repository, delegate } = setup();

    await repository.getById(5);

    expect(delegate.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 5 },
      select: structure,
    });
  });

  it("getByIds reads the full structure of the given ads", async () => {
    const { repository, delegate } = setup();

    await repository.getByIds([1, 2]);

    expect(delegate.findMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2] } }, select: structure });
  });

  it("getForScraping reads ads that are not excluded, oldest scrapedAt first", async () => {
    const { repository, delegate } = setup();

    await repository.getForScraping(10);

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { excluded: false },
      take: 10,
      orderBy: { scrapedAt: "asc" },
      select: { id: true, asin: true, name: true },
    });
  });

  it("updateScrapedAt runs a raw UPDATE for the given ids", async () => {
    const { repository, $executeRaw } = setup();

    await repository.updateScrapedAt([1, 2]);

    const [strings, ...values] = $executeRaw.mock.calls[0];
    expect(strings.join("?")).toBe(
      "UPDATE AmazonAd SET scrapedAt = NOW() WHERE id IN (?)"
    );
    expect(values[0]).toEqual(Prisma.join([1, 2]));
  });

  it("updateScrapedAt skips the query for an empty id list", async () => {
    const { repository, $executeRaw } = setup();

    await expect(repository.updateScrapedAt([])).resolves.toBe(0);

    expect($executeRaw).not.toHaveBeenCalled();
  });

  it("getAll and getCount build the expected queries", async () => {
    const { repository, delegate } = setup();
    const from = new Date(1);
    const to = new Date(2);

    await repository.getAll();
    await repository.getCount(from, to);

    expect(delegate.findMany).toHaveBeenCalledWith();
    expect(delegate.count).toHaveBeenCalledWith({
      where: { createdAt: { lte: to, gte: from } },
    });
  });

  it("create, update and delete delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { asin: "A" } as Prisma.AmazonAdCreateInput;

    await repository.create(data);
    await repository.update(3, { name: "x" });
    await repository.delete(4);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { name: "x" },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it("getMaxId returns the highest id of the matching ads, 0 without any", async () => {
    const { repository, delegate } = setup();
    delegate.aggregate.mockResolvedValueOnce({ _max: { id: 25 } }).mockResolvedValueOnce({ _max: { id: null } });
    const where = { categoryId: { in: [7] } };

    expect(await repository.getMaxId(where)).toBe(25);
    expect(await repository.getMaxId({})).toBe(0);
    expect(delegate.aggregate).toHaveBeenCalledWith({ where, _max: { id: true } });
  });

  it("getForMatch reads the fields matching needs", async () => {
    const { repository, delegate } = setup();

    await repository.getForMatch({ excluded: null });

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { excluded: null },
      select: { id: true, name: true, categoryId: true, excluded: true },
    });
  });

  it("setExcluded updates the given ids and skips an empty list", async () => {
    const { repository, delegate } = setup();
    delegate.updateMany.mockResolvedValue({ count: 2 });

    expect(await repository.setExcluded([1, 2], true)).toBe(2);
    expect(await repository.setExcluded([], false)).toBe(0);
    expect(delegate.updateMany).toHaveBeenCalledTimes(1);
    expect(delegate.updateMany).toHaveBeenCalledWith({ where: { id: { in: [1, 2] } }, data: { excluded: true } });
  });

  it("createMany skips existing ASINs and deleteMany removes the ids, both returning the count", async () => {
    const { repository, delegate } = setup();
    delegate.createMany.mockResolvedValue({ count: 3 });
    delegate.deleteMany.mockResolvedValue({ count: 1 });
    const data = [{ asin: "A" }] as never;

    expect(await repository.createMany(data)).toBe(3);
    expect(await repository.deleteMany([5])).toBe(1);
    expect(delegate.createMany).toHaveBeenCalledWith({ data, skipDuplicates: true });
    expect(delegate.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [5] } } });
  });
});
