import { describe, expect, it } from "vitest";
import { SystemLogRepository } from "@/shared/logging/repositories/SystemLogRepository";
import { fakePrisma } from "../../../../support/fakes";

describe("SystemLogRepository", () => {
  it("creates a row", async () => {
    const db = fakePrisma();
    const repository = new SystemLogRepository(db.prisma);
    const data = {
      level: "error" as const,
      source: "http",
      message: "boom",
      createdAt: new Date(1),
    };

    await repository.create(data);

    expect(db.systemLog.create).toHaveBeenCalledWith({ data });
  });

  it("deletes logs older than a date in batches until a batch comes back short", async () => {
    const db = fakePrisma();
    const repository = new SystemLogRepository(db.prisma);
    db.$executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const date = new Date(5);

    expect(await repository.deleteOlderThan(date, 2)).toBe(3);

    expect(db.$executeRaw).toHaveBeenCalledTimes(2);
    const [strings, ...values] = db.$executeRaw.mock.calls[0];
    expect(strings.join("?")).toBe(
      "DELETE FROM SystemLog WHERE createdAt < ? LIMIT ?"
    );
    expect(values).toEqual([date, 2]);
  });

  it("getCountByLevelAndHour converts the raw numbers", async () => {
    const db = fakePrisma();
    const repository = new SystemLogRepository(db.prisma);
    db.$queryRaw.mockResolvedValue([{ level: "warn", hour: 3600n, value: 2n }]);
    const from = new Date(1);
    const to = new Date(2);

    expect(await repository.getCountByLevelAndHour(from, to)).toEqual([
      { level: "warn", hour: 3600, value: 2 },
    ]);
    const [, ...values] = db.$queryRaw.mock.calls[0];
    expect(values).toEqual([from, to]);
  });

  it("getCountBySourceAndLevel groups errors and warnings by source", async () => {
    const db = fakePrisma();
    const repository = new SystemLogRepository(db.prisma);
    db.systemLog.groupBy.mockResolvedValue([
      { source: "A", level: "error", _count: { _all: 3 } },
    ]);
    const from = new Date(1);
    const to = new Date(2);

    expect(await repository.getCountBySourceAndLevel(from, to)).toEqual([
      { source: "A", level: "error", value: 3 },
    ]);
    expect(db.systemLog.groupBy).toHaveBeenCalledWith({
      by: ["source", "level"],
      where: { level: { in: ["error", "warn"] }, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    });
  });
});
