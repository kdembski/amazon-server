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
});
