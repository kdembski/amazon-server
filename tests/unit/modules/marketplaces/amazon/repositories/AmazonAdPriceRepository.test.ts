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

  it("getByAdAndCountry takes the 5 newest prices of each country and skips countries without prices", async () => {
    const { repository, delegate } = setup();
    const pl = buildPriceCountry({ id: 1 });
    const de = buildPriceCountry({ id: 2 });
    const pl1 = buildPrice({ country: pl });
    const pl2 = buildPrice({ country: pl });
    const de1 = buildPrice({ country: de });
    delegate.findMany
      .mockResolvedValueOnce([pl1, pl2])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([de1]);

    const result = await repository.getByAdAndCountry(9, [1, 3, 2]);

    for (const countryId of [1, 3, 2]) {
      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { adId: 9, countryId },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: structure,
      });
    }
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
