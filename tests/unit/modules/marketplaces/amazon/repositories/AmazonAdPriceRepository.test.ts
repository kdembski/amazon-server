import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { buildPrice, buildPriceCountry } from "../../../../../support/factories";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonAdPriceRepository(db.prisma),
    delegate: db.amazonAdPrice,
    $queryRaw: db.$queryRaw,
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

  it("getRecentByAd loads the prices of the newest ids per country and groups them preserving order", async () => {
    const { repository, delegate, $queryRaw } = setup();
    const pl = buildPriceCountry({ id: 1 });
    const de = buildPriceCountry({ id: 2 });
    const pl1 = buildPrice({ country: pl });
    const de1 = buildPrice({ country: de });
    const pl2 = buildPrice({ country: pl });
    $queryRaw.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    delegate.findMany.mockResolvedValue([pl1, de1, pl2]);

    const result = await repository.getRecentByAd(9, 3);

    const [, adId, count] = $queryRaw.mock.calls[0];
    expect([adId, count]).toEqual([9, 3]);
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2, 3] } },
      orderBy: { createdAt: "desc" },
      select: structure,
    });
    expect(result).toEqual([[pl1, pl2], [de1]]);
  });

  it("getRecentByAd returns no groups without prices", async () => {
    const { repository, delegate } = setup();

    expect(await repository.getRecentByAd(9)).toEqual([]);
    expect(delegate.findMany).not.toHaveBeenCalled();
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
});
