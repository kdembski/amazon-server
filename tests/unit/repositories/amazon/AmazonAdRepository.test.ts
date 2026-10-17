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
    const rulesWhere = {
      AND: [
        {
          OR: [
            { AND: [{ OR: [{ name: { contains: "drill" } }] }] },
            {
              AND: [
                { OR: [{ name: { contains: "rtx" } }] },
                {
                  OR: [
                    { name: { contains: "4090" } },
                    { name: { contains: "4080" } },
                  ],
                },
                { NOT: { name: { contains: "laptop" } } },
              ],
            },
          ],
        },
        {
          NOT: {
            OR: [
              { name: { contains: "used" } },
              { name: { contains: "50\\%" } },
            ],
          },
        },
      ],
    };
    const rules = () => [
      buildSearchRule({ value: "drill" }),
      buildSearchRule({ value: "rtx+4090|4080+!laptop" }),
      buildSearchRule({ value: "!used|50%" }),
    ];

    it("rematches in id batches, flagging matches before clearing the rest, and sums the counts", async () => {
      const { repository, delegate } = setup(10);
      delegate.aggregate.mockResolvedValue({ _max: { id: 25 } });
      delegate.updateMany.mockImplementation(async ({ data }) => ({
        count: data.matchesRules ? 1 : 2,
      }));

      await expect(repository.matchSearchRules(rules())).resolves.toEqual({
        matched: 3,
        unmatched: 6,
      });

      expect(delegate.aggregate).toHaveBeenCalledWith({ _max: { id: true } });
      expect(delegate.updateMany).toHaveBeenCalledTimes(6);
      expect(delegate.updateMany).toHaveBeenNthCalledWith(1, {
        where: {
          AND: [
            {
              AND: [
                { id: { gt: 0, lte: 10 } },
                { OR: [{ matchesRules: false }, { matchesRules: null }] },
              ],
            },
            rulesWhere,
          ],
        },
        data: { matchesRules: true },
      });
      expect(delegate.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          AND: [
            {
              AND: [
                { id: { gt: 0, lte: 10 } },
                { OR: [{ matchesRules: true }, { matchesRules: null }] },
              ],
            },
            { NOT: rulesWhere },
          ],
        },
        data: { matchesRules: false },
      });
      expect(
        delegate.updateMany.mock.calls.map((call) => call[0].where.AND[0].AND[0])
      ).toEqual([
        { id: { gt: 0, lte: 10 } },
        { id: { gt: 0, lte: 10 } },
        { id: { gt: 10, lte: 20 } },
        { id: { gt: 10, lte: 20 } },
        { id: { gt: 20, lte: 30 } },
        { id: { gt: 20, lte: 30 } },
      ]);
    });

    it("updates nothing on an empty table", async () => {
      const { repository, delegate } = setup();
      delegate.aggregate.mockResolvedValue({ _max: { id: null } });

      await expect(repository.matchSearchRules(rules())).resolves.toEqual({
        matched: 0,
        unmatched: 0,
      });

      expect(delegate.updateMany).not.toHaveBeenCalled();
    });

    it("with onlyNew updates the never matched ads in one go", async () => {
      const { repository, delegate } = setup();
      delegate.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.matchSearchRules(rules(), true)).resolves.toEqual({
        matched: 1,
        unmatched: 1,
      });

      expect(delegate.aggregate).not.toHaveBeenCalled();
      expect(delegate.updateMany).toHaveBeenNthCalledWith(1, {
        where: { AND: [{ matchesRules: null }, rulesWhere] },
        data: { matchesRules: true },
      });
      expect(delegate.updateMany).toHaveBeenNthCalledWith(2, {
        where: { AND: [{ matchesRules: null }, { NOT: rulesWhere }] },
        data: { matchesRules: false },
      });
    });

    it("skips the match and clears every ad without a positive rule", async () => {
      const { repository, delegate } = setup();
      delegate.aggregate.mockResolvedValue({ _max: { id: 5 } });
      delegate.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        repository.matchSearchRules([buildSearchRule({ value: "!used" })])
      ).resolves.toEqual({ matched: 0, unmatched: 2 });

      expect(delegate.updateMany).toHaveBeenCalledTimes(1);
      expect(delegate.updateMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              AND: [
                { id: { gt: 0, lte: 20_000 } },
                { OR: [{ matchesRules: true }, { matchesRules: null }] },
              ],
            },
          ],
        },
        data: { matchesRules: false },
      });
    });

    it("builds a plain OR without global exclusions", async () => {
      const { repository, delegate } = setup();
      delegate.updateMany.mockResolvedValue({ count: 0 });

      await repository.matchSearchRules([buildSearchRule({ value: "sony" })], true);

      expect(delegate.updateMany.mock.calls[0][0].where.AND[1]).toEqual({
        OR: [{ AND: [{ OR: [{ name: { contains: "sony" } }] }] }],
      });
    });

    it("skips and reports rules that fail to parse", async () => {
      const { repository, delegate } = setup();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      delegate.updateMany.mockResolvedValue({ count: 0 });

      await repository.matchSearchRules(
        [buildSearchRule({ value: "a++b" }), buildSearchRule({ value: "sony" })],
        true
      );

      expect(delegate.updateMany.mock.calls[0][0].where.AND[1]).toEqual({
        OR: [{ AND: [{ OR: [{ name: { contains: "sony" } }] }] }],
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
