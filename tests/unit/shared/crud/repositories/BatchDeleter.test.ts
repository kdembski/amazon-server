import { describe, expect, it } from "vitest";
import { BatchDeleter } from "@/shared/crud/repositories/BatchDeleter";
import { fakePrisma } from "../../../../support/fakes";

describe("BatchDeleter", () => {
  it("deletes in batches until a batch is not full and returns the total", async () => {
    const db = fakePrisma();
    db.$executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const date = new Date(5);

    expect(await new BatchDeleter(db.prisma).deleteOlderThan("SystemLog", "createdAt", date, 2)).toBe(5);

    expect(db.$executeRaw).toHaveBeenCalledTimes(3);
    const [query] = db.$executeRaw.mock.calls[0];
    expect(query.sql).toBe("DELETE FROM SystemLog WHERE createdAt < ? LIMIT ?");
    expect(query.values).toEqual([date, 2]);
  });
});
