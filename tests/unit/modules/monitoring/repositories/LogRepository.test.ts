import { describe, expect, it } from "vitest";
import { LogRepository } from "@/modules/monitoring/repositories/LogRepository";
import { fakePrisma } from "../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new LogRepository(db.prisma), delegate: db.log };
};

describe("LogRepository", () => {
  it("filters by event and time window", async () => {
    const { repository, delegate } = setup();
    const from = new Date(1);
    const to = new Date(2);

    await repository.getCountByEvent("ad_scraped", from, to);

    const where = { event: "ad_scraped", createdAt: { lte: to, gte: from } };
    expect(delegate.count).toHaveBeenCalledWith({ where });
  });

  it("deletes logs older than a date in batches until a batch comes back short", async () => {
    const db = fakePrisma();
    const repository = new LogRepository(db.prisma);
    db.$executeRaw
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const date = new Date(5);

    expect(await repository.deleteOlderThan(date, 2)).toBe(5);

    expect(db.$executeRaw).toHaveBeenCalledTimes(3);
    const [strings, ...values] = db.$executeRaw.mock.calls[0];
    expect(strings.join("?")).toBe(
      "DELETE FROM Log WHERE createdAt < ? LIMIT ?"
    );
    expect(values).toEqual([date, 2]);
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
