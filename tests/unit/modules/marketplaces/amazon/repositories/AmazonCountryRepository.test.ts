import { describe, expect, it } from "vitest";
import { AmazonCountryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonCountryRepository(db.prisma),
    delegate: db.amazonCountry,
  };
};

describe("AmazonCountryRepository", () => {
  it("reads by country id, all and the scraped ones", async () => {
    const { repository, delegate } = setup();

    await repository.getById(1);
    await repository.getAll();
    await repository.getForScraping();

    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { countryId: 1 } });
    expect(delegate.findMany).toHaveBeenCalledWith();
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { scraped: true },
      select: { countryId: true, tld: true, proxyType: true },
    });
  });

  it("writes by country id", async () => {
    const { repository, delegate } = setup();
    const data = {
      countryId: 1,
      tld: "de",
      scraped: true,
      active: true,
      proxyType: "datacenter",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.create(data);
    await repository.update(2, { tld: "x" });

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { countryId: 2 },
      data: { tld: "x" },
    });
  });
});
