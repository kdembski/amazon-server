import { describe, expect, it, vi } from "vitest";
import { AmazonExclusionRuleTarget } from "@/modules/marketplaces/amazon/services/AmazonExclusionRuleTarget";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdCategoryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdCategoryRepository";
import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = (matchBatchSize?: number) => {
  const db = fakePrisma();
  const exclusionRuleRepository = { getAll: vi.fn() };
  const repository = new AmazonExclusionRuleTarget(
    new AmazonAdRepository(db.prisma),
    exclusionRuleRepository as unknown as AmazonExclusionRuleRepository,
    new AmazonAdCategoryRepository(db.prisma),
    matchBatchSize
  );
  return { repository, exclusionRuleRepository, delegate: db.amazonAd, categories: db.amazonAdCategory };
};

describe("AmazonExclusionRuleTarget", () => {
  it("is the target of the amazon marketplace", () => {
    expect(setup().repository.marketplace).toBe("amazon");
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
      delegate.aggregate.mockResolvedValue({ _min: { id: 1 }, _max: { id: 1 } });
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
      delegate.aggregate.mockResolvedValue({ _min: { id: 1 }, _max: { id: 25 } });
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

      expect(delegate.aggregate).toHaveBeenCalledWith({ where: {}, _min: { id: true }, _max: { id: true } });
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
      delegate.aggregate.mockResolvedValue({ _min: { id: 1 }, _max: { id: 15 } });
      delegate.findMany.mockResolvedValue([]);
      const where = { categoryId: { in: [7, 8] } };

      await repository.matchExclusionRules(excludes, [7, 8]);

      expect(delegate.aggregate).toHaveBeenCalledWith({ where, _min: { id: true }, _max: { id: true } });
      expect(delegate.findMany.mock.calls).toEqual([
        [{ where: { ...where, id: { gt: 0, lte: 10 } }, select }],
        [{ where: { ...where, id: { gt: 10, lte: 20 } }, select }],
      ]);
    });

    it("updates nothing on an empty table", async () => {
      const { repository, delegate } = setup();
      delegate.aggregate.mockResolvedValue({ _min: { id: null }, _max: { id: null } });

      await expect(repository.matchExclusionRules(excludes)).resolves.toEqual({
        excluded: 0,
        included: 0,
        scanned: 0,
      });

      expect(delegate.findMany).not.toHaveBeenCalled();
      expect(delegate.updateMany).not.toHaveBeenCalled();
    });

    it("with only = \"new\" walks the never checked ads in id batches from the lowest one", async () => {
      const { repository, delegate } = setup(10);
      delegate.aggregate.mockResolvedValue({ _min: { id: 95 }, _max: { id: 110 } });
      delegate.findMany
        .mockResolvedValueOnce([ad(95, "Bosch drill", null), ad(96, "Hammer", null)])
        .mockResolvedValueOnce([ad(110, "Makita drill", null)]);
      delegate.updateMany.mockImplementation(async ({ where }) => ({
        count: where.id.in.length,
      }));

      await expect(repository.matchExclusionRules(excludes, "new")).resolves.toEqual({
        excluded: 2,
        included: 1,
        scanned: 3,
      });

      const where = { excluded: null };
      expect(delegate.aggregate).toHaveBeenCalledWith({ where, _min: { id: true }, _max: { id: true } });
      expect(delegate.findMany.mock.calls).toEqual([
        [{ where: { ...where, id: { gt: 94, lte: 104 } }, select }],
        [{ where: { ...where, id: { gt: 104, lte: 114 } }, select }],
      ]);
      expect(delegate.updateMany.mock.calls).toEqual([
        [{ where: { id: { in: [96] } }, data: { excluded: false } }],
        [{ where: { id: { in: [95] } }, data: { excluded: true } }],
        [{ where: { id: { in: [110] } }, data: { excluded: true } }],
      ]);
    });
  });
});
