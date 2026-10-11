import { describe, expect, it } from "vitest";
import { LogRepository } from "@/repositories/LogRepository";
import { fakePrisma } from "../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new LogRepository(db.prisma), delegate: db.log };
};

describe("LogRepository", () => {
  it("filters by event and time window", async () => {
    const { repository, delegate } = setup();
    const from = new Date(1);
    const to = new Date(2);

    await repository.getByEvent("ad_scraped", from, to);
    await repository.getCountByEvent("ad_scraped", from, to);

    const where = { event: "ad_scraped", createdAt: { lte: to, gte: from } };
    expect(delegate.findMany).toHaveBeenCalledWith({ where });
    expect(delegate.count).toHaveBeenCalledWith({ where });
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();

    await repository.create({ event: "x", createdAt: new Date(0) });
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({
      data: { event: "x", createdAt: new Date(0) },
    });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
