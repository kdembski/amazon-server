import { describe, expect, it } from "vitest";
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
});
