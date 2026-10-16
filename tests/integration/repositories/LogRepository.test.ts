import { describe, expect, it } from "vitest";
import { LogRepository } from "@/repositories/LogRepository";
import { FIXED_DATE } from "../../support/factories";
import { prisma } from "../../support/integration/db";
import { seedLog } from "../../support/integration/seed";

const repository = new LogRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);

describe("LogRepository (MySQL)", () => {
  it("getByEvent and getCountByEvent filter by event and inclusive date bounds", async () => {
    const early = await seedLog({ event: "ad_scraped", createdAt: minute(0) });
    const mid = await seedLog({ event: "ad_scraped", createdAt: minute(5) });
    await seedLog({ event: "ad_scraped", createdAt: minute(10) });
    await seedLog({ event: "pricing_error_sent", createdAt: minute(5) });

    expect(await repository.getCountByEvent("ad_scraped")).toBe(3);
    expect(await repository.getCountByEvent("ad_scraped", minute(0), minute(5))).toBe(2);
    expect(await repository.getCountByEvent("ad_scraped", minute(6))).toBe(1);
    expect(await repository.getCountByEvent("missing")).toBe(0);
    expect(
      (await repository.getByEvent("ad_scraped", minute(0), minute(5))).map((l) => l.id)
    ).toEqual([early.id, mid.id]);
  });

  it("deleteOlderThan removes rows strictly before the date across batches", async () => {
    await seedLog({ event: "ad_scraped", createdAt: minute(0) });
    await seedLog({ event: "ad_scraped", createdAt: minute(1) });
    await seedLog({ event: "pricing_error_sent", createdAt: minute(2) });
    const boundary = await seedLog({ event: "ad_scraped", createdAt: minute(3) });
    const later = await seedLog({ event: "ad_scraped", createdAt: minute(4) });

    expect(await repository.deleteOlderThan(minute(3), 2)).toBe(3);
    expect((await prisma.log.findMany()).map((l) => l.id)).toEqual([
      boundary.id,
      later.id,
    ]);
  });

  it("create stores optional data and delete removes the row", async () => {
    const log = await repository.create({
      event: "ad_scraped",
      data: "payload",
      createdAt: FIXED_DATE,
    });

    expect(log).toMatchObject({ event: "ad_scraped", data: "payload" });

    await repository.delete(log.id);

    expect(await prisma.log.count()).toBe(0);
  });
});
