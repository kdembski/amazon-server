import { describe, expect, it } from "vitest";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";
import { FIXED_DATE } from "../../../../support/factories";
import { prisma } from "../../../../support/integration/db";
import { seedActivityEvent } from "../../../../support/integration/seed";

const repository = new ActivityEventRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);
const conversionError = (channel: string | number) =>
  seedActivityEvent({
    type: "conversion_error_sent",
    data: { asin: "B000SEED00", channel, prices: [] },
  });

describe("ActivityEventRepository (MySQL)", () => {
  it("getCount filters by type and inclusive date bounds", async () => {
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(0) });
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(5) });
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(10) });
    await seedActivityEvent({ type: "pricing_error_sent", createdAt: minute(5) });

    expect(await repository.getCount("ad_scraped")).toBe(3);
    expect(await repository.getCount("ad_scraped", minute(0), minute(5))).toBe(2);
    expect(await repository.getCount("ad_scraped", minute(6))).toBe(1);
    expect(await repository.getCount("conversion_error_sent")).toBe(0);
  });

  it("getCount counts conversion errors of exactly the given string channel", async () => {
    await conversionError("3");
    await conversionError("3");
    await conversionError("30");
    await conversionError(3);

    expect(
      await repository.getCount("conversion_error_sent", undefined, undefined, "3")
    ).toBe(2);
    expect(await repository.getCount("conversion_error_sent")).toBe(4);
  });

  it("deleteOlderThan removes rows strictly before the date across batches", async () => {
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(0) });
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(1) });
    await seedActivityEvent({ type: "pricing_error_sent", createdAt: minute(2) });
    const boundary = await seedActivityEvent({ type: "ad_scraped", createdAt: minute(3) });
    const later = await seedActivityEvent({ type: "ad_scraped", createdAt: minute(4) });

    expect(await repository.deleteOlderThan(minute(3), 2)).toBe(3);
    expect((await prisma.activityEvent.findMany()).map((e) => e.id)).toEqual([
      boundary.id,
      later.id,
    ]);
  });

  it("create stores JSON data and delete removes the row", async () => {
    const data = {
      asin: "B0X",
      prices: [{ country: "de", value: "412.5", currency: "EUR" }],
    };
    const created = await repository.create({
      type: "pricing_error_sent",
      marketplace: "amazon",
      data,
      createdAt: FIXED_DATE,
    });

    const stored = await prisma.activityEvent.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(stored).toMatchObject({
      type: "pricing_error_sent",
      marketplace: "amazon",
      data,
    });

    await repository.delete(created.id);

    expect(await prisma.activityEvent.count()).toBe(0);
  });
});
