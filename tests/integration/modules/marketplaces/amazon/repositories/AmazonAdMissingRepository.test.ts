import { describe, expect, it } from "vitest";
import { AmazonAdMissingRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdMissingRepository";
import { FIXED_DATE } from "../../../../../support/factories";
import { prisma } from "../../../../../support/integration/db";
import { seedAd, seedAdMissing, seedAmazonCountryRoute } from "../../../../../support/integration/seed";

const repository = new AmazonAdMissingRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);

describe("AmazonAdMissingRepository (MySQL)", () => {
  it("getByAdIds returns the missing routes of the given ads only", async () => {
    const ad = await seedAd();
    const other = await seedAd();
    const first = await seedAdMissing({ adId: ad.id });
    const second = await seedAdMissing({ adId: ad.id });
    await seedAdMissing({ adId: other.id });

    const rows = await repository.getByAdIds([ad.id]);

    expect(rows).toEqual([
      { adId: ad.id, routeId: first.routeId },
      { adId: ad.id, routeId: second.routeId },
    ]);
  });

  it("createMany skips an existing ad and route and keeps its createdAt", async () => {
    const existing = await seedAdMissing({ createdAt: minute(0) });
    const { id: routeId } = await seedAmazonCountryRoute();

    const count = await repository.createMany([
      { adId: existing.adId, routeId: existing.routeId, createdAt: minute(5) },
      { adId: existing.adId, routeId, createdAt: minute(5) },
    ]);

    expect(count).toBe(1);
    const rows = await prisma.amazonAdMissing.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.map((row) => [row.routeId, row.createdAt])).toEqual([
      [existing.routeId, minute(0)],
      [routeId, minute(5)],
    ]);
  });

  it("deleteOlderThan removes rows strictly before the date across batches", async () => {
    await seedAdMissing({ createdAt: minute(0) });
    await seedAdMissing({ createdAt: minute(1) });
    await seedAdMissing({ createdAt: minute(2) });
    const boundary = await seedAdMissing({ createdAt: minute(3) });

    expect(await repository.deleteOlderThan(minute(3), 2)).toBe(3);
    expect(await prisma.amazonAdMissing.findMany()).toEqual([boundary]);
  });

  it("is deleted together with its ad", async () => {
    const missing = await seedAdMissing();

    await prisma.amazonAd.delete({ where: { id: missing.adId } });

    expect(await prisma.amazonAdMissing.count()).toBe(0);
  });
});
