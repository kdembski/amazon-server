import { describe, expect, it } from "vitest";
import { AmazonCountryRouteRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRouteRepository";
import { fakePrisma } from "../../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return {
    repository: new AmazonCountryRouteRepository(db.prisma),
    delegate: db.amazonCountryRoute,
  };
};

describe("AmazonCountryRouteRepository", () => {
  it("reads all routes by country, highest priority first", async () => {
    const { repository, delegate } = setup();

    await repository.getAll();

    expect(delegate.findMany).toHaveBeenCalledWith({
      orderBy: [{ countryId: "asc" }, { priority: "desc" }],
    });
  });

  it("creates, updates and deletes by id", async () => {
    const { repository, delegate } = setup();
    const data = {
      countryId: 1,
      priority: 3,
      proxyType: "direct",
      pdpSource: "aod",
      maxAttempts: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.create(data);
    await repository.update(2, { priority: 1 });
    await repository.delete(4);

    expect(delegate.create).toHaveBeenCalledWith({ data });
    expect(delegate.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { priority: 1 } });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });
});
