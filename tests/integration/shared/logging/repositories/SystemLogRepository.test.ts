import { beforeEach, describe, expect, it } from "vitest";
import { SystemLogRepository } from "@/shared/logging/repositories/SystemLogRepository";
import { FIXED_DATE } from "../../../../support/factories";
import { prisma } from "../../../../support/integration/db";

const repository = new SystemLogRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);
const create = (createdAt: Date) =>
  repository.create({ level: "info", source: "test", message: "m", createdAt });

describe("SystemLogRepository (MySQL)", () => {
  it("stores json context", async () => {
    await repository.create({
      level: "error",
      source: "http",
      message: "boom",
      context: { request: { method: "PUT", params: { id: "1" } } },
      createdAt: minute(0),
    });

    expect(await prisma.systemLog.findMany()).toEqual([
      expect.objectContaining({
        level: "error",
        context: { request: { method: "PUT", params: { id: "1" } } },
      }),
    ]);
  });

  it("deleteOlderThan removes rows strictly before the date across batches", async () => {
    await create(minute(0));
    await create(minute(1));
    await create(minute(2));
    const boundary = await create(minute(3));

    expect(await repository.deleteOlderThan(minute(3), 2)).toBe(3);
    expect((await prisma.systemLog.findMany()).map((l) => l.id)).toEqual([boundary.id]);
  });

  describe("in [from, to)", () => {
    const at = (iso: string) => new Date(iso);
    const log = (level: "error" | "warn" | "info", source: string, iso: string) =>
      repository.create({ level, source, message: "m", createdAt: at(iso) });
    const from = at("2026-10-26T10:00:00Z");
    const to = at("2026-10-26T12:00:00Z");

    beforeEach(async () => {
      await log("error", "A", "2026-10-26T10:00:00Z");
      await log("error", "A", "2026-10-26T10:30:00Z");
      await log("warn", "B", "2026-10-26T11:59:00Z");
      await log("info", "A", "2026-10-26T10:10:00Z");
      await log("error", "A", "2026-10-26T12:00:00Z");
      await log("warn", "B", "2026-10-26T09:59:00Z");
    });

    it("getCountByLevelAndHour counts errors and warnings per UTC hour", async () => {
      const rows = await repository.getCountByLevelAndHour(from, to);

      expect(rows).toEqual(
        expect.arrayContaining([
          { level: "error", hour: Date.parse("2026-10-26T10:00:00Z") / 1000, value: 2 },
          { level: "warn", hour: Date.parse("2026-10-26T11:00:00Z") / 1000, value: 1 },
        ])
      );
      expect(rows).toHaveLength(2);
    });

    it("getCountBySourceAndLevel counts errors and warnings per source", async () => {
      const rows = await repository.getCountBySourceAndLevel(from, to);

      expect(rows).toEqual(
        expect.arrayContaining([
          { source: "A", level: "error", value: 2 },
          { source: "B", level: "warn", value: 1 },
        ])
      );
      expect(rows).toHaveLength(2);
    });
  });
});
