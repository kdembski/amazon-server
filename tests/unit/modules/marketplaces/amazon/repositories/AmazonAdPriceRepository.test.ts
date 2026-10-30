import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { AmazonAdRecentPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdRecentPriceMapper";
import { buildPrice } from "../../../../../support/factories";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonAdPriceRepository(db.prisma),
    delegate: db.amazonAdPrice,
    $queryRaw: db.$queryRaw,
    $executeRaw: db.$executeRaw,
  };
};

// AmazonAdPriceSelectDto is derived from this select; keep it in sync on purpose.
const structure = {
  id: true,
  adId: true,
  countryId: true,
  value: true,
  dispatchFrom: true,
  createdAt: true,
  updatedAt: true,
  country: {
    select: {
      tld: true,
      active: true,
      country: {
        select: {
          id: true,
          name: true,
          code: true,
          currencyId: true,
          currency: true,
        },
      },
    },
  },
};

describe("AmazonAdPriceRepository", () => {
  it("getById selects the full price structure with country and currency", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);

    expect(delegate.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: structure,
    });
  });

  it("getRecentByAd queries the ad and count and returns the rows grouped by the mapper", async () => {
    const db = fakePrisma();
    const groups = [[buildPrice()]];
    const mapper = { toCountryGroups: vi.fn().mockReturnValue(groups) };
    const repository = new AmazonAdPriceRepository(
      db.prisma,
      mapper as unknown as AmazonAdRecentPriceMapper
    );
    const rows = [{ id: 1 }];
    db.$queryRaw.mockResolvedValue(rows);

    expect(await repository.getRecentByAd(9, 3)).toBe(groups);

    const [, adId, count] = db.$queryRaw.mock.calls[0];
    expect([adId, count]).toEqual([9, 3]);
    expect(mapper.toCountryGroups).toHaveBeenCalledWith(rows);
  });

  it("create, update and delete delegate to prisma", async () => {
    const { repository, delegate } = setup();
    const data = { value: 1 } as Prisma.AmazonAdPriceCreateInput;

    await repository.create(data);
    await repository.update(3, { value: 2 });
    await repository.delete(4);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { value: 2 },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it("createMany inserts the prices and returns their count", async () => {
    const { repository, delegate } = setup();
    const prices = [{ adId: 1, countryId: 2, value: 3 }] as Prisma.AmazonAdPriceCreateManyInput[];
    delegate.createMany.mockResolvedValue({ count: 1 });

    expect(await repository.createMany(prices)).toBe(1);
    expect(delegate.createMany).toHaveBeenCalledWith({ data: prices });
  });

  it("deletes prices older than a date in batches until a batch comes back short", async () => {
    const { repository, $executeRaw } = setup();
    $executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const date = new Date(5);

    expect(await repository.deleteOlderThan(date, 2)).toBe(5);

    expect($executeRaw).toHaveBeenCalledTimes(3);
    const [strings, ...values] = $executeRaw.mock.calls[0];
    expect(strings.join("?")).toBe("DELETE FROM AmazonAdPrice WHERE createdAt < ? LIMIT ?");
    expect(values).toEqual([date, 2]);
  });
});
