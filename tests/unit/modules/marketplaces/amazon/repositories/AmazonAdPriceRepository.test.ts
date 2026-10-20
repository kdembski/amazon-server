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
      id: true,
      name: true,
      code: true,
      currencyId: true,
      currency: true,
      active: true,
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

  it("getRecentByAd takes the prices since the given date and groups them per country preserving order", async () => {
    const { repository, delegate } = setup();
    const pl = buildPriceCountry({ id: 1 });
    const de = buildPriceCountry({ id: 2 });
    const pl1 = buildPrice({ country: pl });
    const de1 = buildPrice({ country: de });
    const pl2 = buildPrice({ country: pl });
    delegate.findMany.mockResolvedValue([pl1, de1, pl2]);
    const since = new Date(1);

    const result = await repository.getRecentByAd(9, since);

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { adId: 9, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: structure,
    });
    expect(result).toEqual([[pl1, pl2], [de1]]);
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
