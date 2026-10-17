import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { buildSearchRule } from "../../../support/factories";
import { fakePrisma } from "../../../support/fakes";

const setup = (matchBatchSize?: number) => {
  const db = fakePrisma();
  const repository = new AmazonAdRepository(db.prisma, matchBatchSize);
  return { repository, delegate: db.amazonAd, $executeRaw: db.$executeRaw };
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

  it("getForScraping reads matching ads, oldest scrapedAt first", async () => {
    const { repository, delegate } = setup();

    await repository.getForScraping(10);

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { matchesRules: true },
      take: 10,
      orderBy: { scrapedAt: "asc" },
      select: { id: true, asin: true, name: true },
    });
  });

  describe("matchSearchRules", () => {
    const select = { id: true, name: true, matchesRules: true };
    const ad = (id: number, name: string, matchesRules: boolean | null) => ({
      id,
      name,
      matchesRules,
    });
    const rules = () => [
      buildSearchRule({ value: "drill" }),
      buildSearchRule({ value: "!used" }),
    ];

    it("rematches in id batches, flagging matches before clearing the rest, and sums the counts", async () => {
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

      await expect(repository.matchSearchRules(rules())).resolves.toEqual({
        matched: 2,
        unmatched: 2,
      });

      expect(delegate.aggregate).toHaveBeenCalledWith({ _max: { id: true } });
      expect(delegate.findMany.mock.calls).toEqual([
        [{ where: { id: { gt: 0, lte: 10 } }, select }],
        [{ where: { id: { gt: 10, lte: 20 } }, select }],
        [{ where: { id: { gt: 20, lte: 30 } }, select }],
      ]);
      expect(delegate.updateMany.mock.calls).toEqual([
        [{ where: { id: { in: [1] } }, data: { matchesRules: true } }],
        [{ where: { id: { in: [3, 4] } }, data: { matchesRules: false } }],
        [{ where: { id: { in: [21] } }, data: { matchesRules: true } }],
      ]);
    });

    it("updates nothing on an empty table", async () => {
      const { repository, delegate } = setup();
      delegate.aggregate.mockResolvedValue({ _max: { id: null } });

      await expect(repository.matchSearchRules(rules())).resolves.toEqual({
        matched: 0,
        unmatched: 0,
      });

      expect(delegate.findMany).not.toHaveBeenCalled();
      expect(delegate.updateMany).not.toHaveBeenCalled();
    });

    it("with onlyNew checks the never matched ads in one go", async () => {
      const { repository, delegate } = setup();
      delegate.findMany.mockResolvedValue([
        ad(1, "Bosch drill", null),
        ad(2, "Hammer", null),
      ]);
      delegate.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.matchSearchRules(rules(), true)).resolves.toEqual({
        matched: 1,
        unmatched: 1,
      });

      expect(delegate.aggregate).not.toHaveBeenCalled();
      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { matchesRules: null },
        select,
      });
      expect(delegate.updateMany.mock.calls).toEqual([
        [{ where: { id: { in: [1] } }, data: { matchesRules: true } }],
        [{ where: { id: { in: [2] } }, data: { matchesRules: false } }],
      ]);
    });

    it("matches whole words unless the phrase has a wildcard", async () => {
      const { repository, delegate } = setup();
      delegate.findMany.mockResolvedValue([
        ad(1, "Shaped balloon torebka", null),
        ad(2, "Hape drewniana kuchnia", null),
      ]);
      delegate.updateMany.mockResolvedValue({ count: 1 });

      await repository.matchSearchRules(
        [buildSearchRule({ value: "hape+drewn*" })],
        true
      );

      expect(delegate.updateMany.mock.calls).toEqual([
        [{ where: { id: { in: [2] } }, data: { matchesRules: true } }],
        [{ where: { id: { in: [1] } }, data: { matchesRules: false } }],
      ]);
    });

    it("skips and reports rules that fail to parse", async () => {
      const { repository, delegate } = setup();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      delegate.findMany.mockResolvedValue([ad(1, "Sony a++b", null)]);
      delegate.updateMany.mockResolvedValue({ count: 1 });

      await repository.matchSearchRules(
        [buildSearchRule({ value: "a++b" }), buildSearchRule({ value: "bose" })],
        true
      );

      expect(delegate.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1] } },
        data: { matchesRules: false },
      });
      expect(error).toHaveBeenCalledWith(
        "AmazonAdRepository: skipped search rule a++b: Error: Zasada **a++b** zawiera pusty fragment"
      );
      error.mockRestore();
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
