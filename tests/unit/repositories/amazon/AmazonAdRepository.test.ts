import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { buildKeyword } from "../../../support/factories";
import { fakePrisma } from "../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  const repository = new AmazonAdRepository(db.prisma);
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

  it("getForScraping with an empty blacklist excludes nothing", async () => {
    const { repository, delegate } = setup();

    await repository.getForScraping(5, [1], []);

    expect(delegate.findMany.mock.calls[0][0].where).toEqual({
      AND: [{ categoryId: { in: [1] } }, { NOT: { OR: [] } }],
    });
  });

  it("getForScraping filters by categories and blacklist, oldest scrapedAt first with nulls first", async () => {
    const { repository, delegate } = setup();

    await repository.getForScraping(
      10,
      [1, 2],
      [buildKeyword({ value: "used" }), buildKeyword({ value: "box+damaged" })]
    );

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { categoryId: { in: [1, 2] } },
          {
            NOT: {
              OR: [
                { name: { contains: "used" } },
                {
                  AND: [
                    { name: { contains: "box" } },
                    { name: { contains: "damaged" } },
                  ],
                },
              ],
            },
          },
        ],
      },
      take: 10,
      orderBy: { scrapedAt: { sort: "asc", nulls: "first" } },
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

  it("getAll, getCount and getBlacklistedCount build the expected queries", async () => {
    const { repository, delegate } = setup();
    const from = new Date(1);
    const to = new Date(2);

    await repository.getAll();
    await repository.getCount(from, to);
    await repository.getBlacklistedCount([buildKeyword({ value: "used" })]);

    expect(delegate.findMany).toHaveBeenCalledWith();
    expect(delegate.count).toHaveBeenNthCalledWith(1, {
      where: { createdAt: { lte: to, gte: from } },
    });
    expect(delegate.count).toHaveBeenNthCalledWith(2, {
      where: { OR: [{ name: { contains: "used" } }] },
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
