import { describe, expect, it } from "vitest";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";
import { FIXED_DATE } from "../../../../support/factories";
import { prisma } from "../../../../support/integration/db";
import { seedActivityEvent } from "../../../../support/integration/seed";

const repository = new ActivityEventRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);
const countryOutlier = (channel: string | number) =>
  seedActivityEvent({
    type: "country_outlier_sent",
    data: { asin: "B000SEED00", channel, prices: [] },
  });

describe("ActivityEventRepository (MySQL)", () => {
  it("getCount filters by type and inclusive date bounds", async () => {
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(0) });
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(5) });
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(10) });
    await seedActivityEvent({ type: "price_drop_sent", createdAt: minute(5) });

    expect(await repository.getCount("ad_scraped")).toBe(3);
    expect(await repository.getCount("ad_scraped", minute(0), minute(5))).toBe(2);
    expect(await repository.getCount("ad_scraped", minute(6))).toBe(1);
    expect(await repository.getCount("country_outlier_sent")).toBe(0);
  });

  it("getCount counts country outliers of exactly the given string channel", async () => {
    await countryOutlier("3");
    await countryOutlier("3");
    await countryOutlier("30");
    await countryOutlier(3);

    expect(
      await repository.getCount("country_outlier_sent", undefined, undefined, "3")
    ).toBe(2);
    expect(await repository.getCount("country_outlier_sent")).toBe(4);
  });

  it("deleteOlderThan removes rows strictly before the date across batches", async () => {
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(0) });
    await seedActivityEvent({ type: "ad_scraped", createdAt: minute(1) });
    await seedActivityEvent({ type: "price_drop_sent", createdAt: minute(2) });
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
      type: "price_drop_sent",
      marketplace: "amazon",
      data,
      createdAt: FIXED_DATE,
    });

    const stored = await prisma.activityEvent.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(stored).toMatchObject({
      type: "price_drop_sent",
      marketplace: "amazon",
      data,
    });

    await repository.delete(created.id);

    expect(await prisma.activityEvent.count()).toBe(0);
  });

  it("getSum adds data.count within inclusive bounds and counts a row without it as 1", async () => {
    await seedActivityEvent({ type: "ad_scraped", data: { count: 2 }, createdAt: minute(0) });
    await seedActivityEvent({ type: "ad_scraped", data: { asin: "B0X" }, createdAt: minute(5) });
    await seedActivityEvent({ type: "ad_scraped", data: { count: 4 }, createdAt: minute(10) });
    await seedActivityEvent({ type: "ad_scraped", data: { count: 8 }, createdAt: minute(11) });
    await seedActivityEvent({ type: "price_drop_sent", data: { count: 16 }, createdAt: minute(5) });

    expect(await repository.getSum("ad_scraped", minute(0), minute(10))).toBe(7);
    expect(await repository.getSum("country_outlier_sent", minute(0), minute(10))).toBe(0);
  });

  it("getData returns the data of the rows of a type within inclusive bounds", async () => {
    await seedActivityEvent({ type: "ad_scraped", data: { count: 1 }, createdAt: minute(0) });
    await seedActivityEvent({ type: "ad_scraped", data: { count: 2 }, createdAt: minute(10) });
    await seedActivityEvent({ type: "ad_scraped", data: { count: 3 }, createdAt: minute(11) });
    await seedActivityEvent({ type: "price_drop_sent", data: { count: 4 }, createdAt: minute(5) });

    expect(await repository.getData("ad_scraped", minute(0), minute(10))).toEqual([
      { count: 1 },
      { count: 2 },
    ]);
  });

  it("createMany stores the rows", async () => {
    expect(
      await repository.createMany([
        { type: "ad_scraped", marketplace: "amazon", data: { count: 3 }, createdAt: FIXED_DATE },
      ])
    ).toBe(1);

    expect(await prisma.activityEvent.findMany()).toMatchObject([{ data: { count: 3 } }]);
  });

  it("getSumByTypeChannelAndHour groups by type, channel and UTC hour within [from, to)", async () => {
    const at = (iso: string) => new Date(iso);
    await seedActivityEvent({ type: "ad_scraped", data: { count: 5 }, createdAt: at("2026-10-26T10:00:00Z") });
    await seedActivityEvent({ type: "ad_scraped", data: { asin: "B0X" }, createdAt: at("2026-10-26T10:59:00Z") });
    await seedActivityEvent({ type: "country_outlier_sent", data: { channel: "3" }, createdAt: at("2026-10-26T10:30:00Z") });
    await seedActivityEvent({ type: "country_outlier_sent", data: { channel: 3 }, createdAt: at("2026-10-26T10:40:00Z") });
    await seedActivityEvent({ type: "ad_scraped", data: { count: 7 }, createdAt: at("2026-10-26T12:00:00Z") });
    await seedActivityEvent({ type: "price_drop_sent", data: {}, createdAt: at("2026-10-25T23:59:00Z") });

    const rows = await repository.getSumByTypeChannelAndHour(
      at("2026-10-25T23:00:00Z"),
      at("2026-10-26T12:00:00Z")
    );

    expect(
      rows.map((row) => ({ ...row, hour: new Date(row.hour * 1000).toISOString() }))
    ).toEqual(
      expect.arrayContaining([
        { type: "ad_scraped", channel: null, hour: "2026-10-26T10:00:00.000Z", value: 6 },
        { type: "country_outlier_sent", channel: "3", hour: "2026-10-26T10:00:00.000Z", value: 2 },
        { type: "price_drop_sent", channel: null, hour: "2026-10-25T23:00:00.000Z", value: 1 },
      ])
    );
    expect(rows).toHaveLength(3);
  });
});
