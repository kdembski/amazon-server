import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = (matchBatchSize?: number) => {
  const db = fakePrisma();
  const exclusionRuleRepository = { getAll: vi.fn() };
  const repository = new AmazonAdRepository(
    db.prisma,
    matchBatchSize,
    exclusionRuleRepository as unknown as AmazonExclusionRuleRepository
  );
  return {
    repository,
    exclusionRuleRepository,
    delegate: db.amazonAd,
    categories: db.amazonAdCategory,
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

  it("getExclusionRules maps the category of each rule to its scope", async () => {
    const { repository, exclusionRuleRepository } = setup();
    exclusionRuleRepository.getAll.mockResolvedValue([
      { id: 1, value: "sony", categoryId: 3, inverted: true, createdAt: new Date() },
      { id: 2, value: "bose", categoryId: null, inverted: false, createdAt: new Date() },
    ]);

    await expect(repository.getExclusionRules()).resolves.toEqual([
      { value: "sony", scope: 3, inverted: true },
      { value: "bose", scope: null, inverted: false },
    ]);
  });

  it("getActiveScopes returns the ids of active categories", async () => {
    const { repository, categories } = setup();
    categories.findMany.mockResolvedValue([{ id: 1 }, { id: 3 }]);

    await expect(repository.getActiveScopes()).resolves.toEqual([1, 3]);
    expect(categories.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { id: true },
    });
  });

  describe("matchExclusionRules", () => {
    const select = { id: true, name: true, categoryId: true, excluded: true };
    const ad = (id: number, name: string, excluded: boolean | null) => ({
      id,
      name,
      categoryId: 7,
      excluded,
    });

    it("passes the category of each ad as the scope", async () => {
      const { repository, delegate } = setup();
      delegate.findMany.mockResolvedValue([ad(1, "Bosch drill", null)]);
      delegate.updateMany.mockResolvedValue({ count: 1 });
      const scoped = vi.fn().mockReturnValue(true);

      await repository.matchExclusionRules(scoped, "new");

      expect(scoped).toHaveBeenCalledWith("Bosch drill", 7);
    });
    const excludes = (name: string) => {
      const lower = name.toLowerCase();
      return lower.includes("drill") && !lower.includes("used");
    };

    it("rematches in id batches, including ads before excluding the rest, and sums the counts", async () => {
      const { repository, delegate } = setup(10);
      delegate.aggregate.mockResolvedValue({ _max: { id: 25 } });
      delegate.findMany
        .mockResolvedValueOnce([
          ad(1, "Bosch drill", false),
          ad(2, "Bosch drill", true),
          ad(3, "Used drill", null),
          ad(4, "Hammer", true),
        ])
        .mockResolvedValueOnce([ad(11, "Hammer", false)])
        .mockResolvedValueOnce([ad(21, "Makita drill", null)]);
      delegate.updateMany.mockImplementation(async ({ where }) => ({
        count: where.id.in.length,
      }));

      await expect(repository.matchExclusionRules(excludes)).resolves.toEqual({
        excluded: 2,
        included: 2,
        scanned: 6,
      });

      expect(delegate.aggregate).toHaveBeenCalledWith({ where: {}, _max: { id: true } });
      expect(delegate.findMany.mock.calls).toEqual([
        [{ where: { id: { gt: 0, lte: 10 } }, select }],
        [{ where: { id: { gt: 10, lte: 20 } }, select }],
        [{ where: { id: { gt: 20, lte: 30 } }, select }],
      ]);
      expect(delegate.updateMany.mock.calls).toEqual([
        [{ where: { id: { in: [3, 4] } }, data: { excluded: false } }],
        [{ where: { id: { in: [1] } }, data: { excluded: true } }],
        [{ where: { id: { in: [21] } }, data: { excluded: true } }],
      ]);
    });

    it("with scope ids walks only the ads of these scopes", async () => {
      const { repository, delegate } = setup(10);
      delegate.aggregate.mockResolvedValue({ _max: { id: 15 } });
      delegate.findMany.mockResolvedValue([]);
      const where = { categoryId: { in: [7, 8] } };

      await repository.matchExclusionRules(excludes, [7, 8]);

      expect(delegate.aggregate).toHaveBeenCalledWith({ where, _max: { id: true } });
      expect(delegate.findMany.mock.calls).toEqual([
        [{ where: { ...where, id: { gt: 0, lte: 10 } }, select }],
        [{ where: { ...where, id: { gt: 10, lte: 20 } }, select }],
      ]);
    });

    it("updates nothing on an empty table", async () => {
      const { repository, delegate } = setup();
      delegate.aggregate.mockResolvedValue({ _max: { id: null } });

      await expect(repository.matchExclusionRules(excludes)).resolves.toEqual({
        excluded: 0,
        included: 0,
        scanned: 0,
      });

      expect(delegate.findMany).not.toHaveBeenCalled();
      expect(delegate.updateMany).not.toHaveBeenCalled();
    });

    it("with only = \"new\" checks the never checked ads in one go", async () => {
      const { repository, delegate } = setup();
      delegate.findMany.mockResolvedValue([
        ad(1, "Bosch drill", null),
        ad(2, "Hammer", null),
      ]);
      delegate.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.matchExclusionRules(excludes, "new")).resolves.toEqual({
        excluded: 1,
        included: 1,
        scanned: 2,
      });

      expect(delegate.aggregate).not.toHaveBeenCalled();
      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { excluded: null },
        select,
      });
      expect(delegate.updateMany.mock.calls).toEqual([
        [{ where: { id: { in: [2] } }, data: { excluded: false } }],
        [{ where: { id: { in: [1] } }, data: { excluded: true } }],
      ]);
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
});
