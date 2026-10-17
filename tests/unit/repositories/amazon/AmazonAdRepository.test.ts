import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { buildSearchRule } from "../../../support/factories";
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

  it("getForScraping matches any search rule, oldest scrapedAt first with nulls first", async () => {
    const { repository, delegate } = setup();

    await repository.getForScraping(10, [
      buildSearchRule({ value: "drill" }),
      buildSearchRule({ value: "rtx+4090|4080+!laptop" }),
      buildSearchRule({ value: "!used|50%" }),
    ]);

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: {
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
      },
      take: 10,
      orderBy: { scrapedAt: { sort: "asc", nulls: "first" } },
      select: { id: true, asin: true, name: true },
    });
  });

  it("getForScraping skips and reports rules that fail to parse", async () => {
    const { repository, delegate } = setup();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await repository.getForScraping(5, [
      buildSearchRule({ value: "a++b" }),
      buildSearchRule({ value: "sony" }),
    ]);

    expect(delegate.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ AND: [{ OR: [{ name: { contains: "sony" } }] }] }],
    });
    expect(error).toHaveBeenCalledWith(
      "AmazonAdRepository: skipped search rule a++b: Error: Zasada **a++b** zawiera pusty fragment"
    );
    error.mockRestore();
  });

  it("getForScraping skips the query when no rule has a positive member", async () => {
    const { repository, delegate } = setup();

    await expect(
      repository.getForScraping(5, [buildSearchRule({ value: "!used" })])
    ).resolves.toEqual([]);

    expect(delegate.findMany).not.toHaveBeenCalled();
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
