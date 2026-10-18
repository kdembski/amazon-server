import { describe, expect, it } from "vitest";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";
import { fakePrisma } from "../../../../support/fakes";

const setup = () => {
  const db = fakePrisma();
  return { repository: new ActivityEventRepository(db.prisma), delegate: db.activityEvent };
};

describe("ActivityEventRepository", () => {
  it("filters by type and time window", async () => {
    const { repository, delegate } = setup();
    const from = new Date(1);
    const to = new Date(2);

    await repository.getCount("ad_scraped", from, to);

    const where = { type: "ad_scraped", createdAt: { lte: to, gte: from } };
    expect(delegate.count).toHaveBeenCalledWith({ where });
  });

  it("also filters by the conversion channel stored in data", async () => {
    const { repository, delegate } = setup();
    const from = new Date(1);
    const to = new Date(2);

    await repository.getCount("conversion_error_sent", from, to, "3");

    expect(delegate.count).toHaveBeenCalledWith({
      where: {
        type: "conversion_error_sent",
        createdAt: { lte: to, gte: from },
        data: { path: "$.channel", equals: "3" },
      },
    });
  });

  it("deletes events older than a date in batches until a batch comes back short", async () => {
    const db = fakePrisma();
    const repository = new ActivityEventRepository(db.prisma);
    db.$executeRaw
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const date = new Date(5);

    expect(await repository.deleteOlderThan(date, 2)).toBe(5);

    expect(db.$executeRaw).toHaveBeenCalledTimes(3);
    const [strings, ...values] = db.$executeRaw.mock.calls[0];
    expect(strings.join("?")).toBe(
      "DELETE FROM ActivityEvent WHERE createdAt < ? LIMIT ?"
    );
    expect(values).toEqual([date, 2]);
  });

  it("writes delegate to prisma", async () => {
    const { repository, delegate } = setup();

    const input = {
      type: "ad_scraped" as const,
      marketplace: "amazon" as const,
      data: { asin: "B0X" },
      createdAt: new Date(0),
    };
    await repository.create(input);
    await repository.delete(3);

    expect(delegate.create).toHaveBeenCalledWith({ data: input });
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
