import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { FIXED_DATE } from "../../support/factories";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { messagesSentTo } from "../../support/integration/discordInbox";
import {
  seedAd,
  seedCategory,
  seedCountry,
  seedSearchRule,
  seedPrice,
} from "../../support/integration/seed";

const day = (n: number) => new Date(FIXED_DATE.getTime() + n * 86_400_000);

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("GET /amazon/ads/scrap", () => {
  it("returns the next rule-matching ads to scrape and stamps scrapedAt", async () => {
    await seedSearchRule({ value: "sony" });
    const never = await seedAd({ name: "Sony A", scrapedAt: null });
    const older = await seedAd({ name: "Sony B", scrapedAt: day(1) });
    const newer = await seedAd({ name: "Sony C", scrapedAt: day(2) });
    const unmatched = await seedAd({ name: "Bose D", scrapedAt: null });

    const res = await request(app).get("/amazon/ads/scrap?count=2").expect(200);

    expect(res.body).toEqual([
      { id: never.id, asin: never.asin, name: never.name },
      { id: older.id, asin: older.asin, name: older.name },
    ]);
    const rows = await prisma.amazonAd.findMany({ orderBy: { id: "asc" } });
    expect(rows.map((r) => r.id)).toEqual([never.id, older.id, newer.id, unmatched.id]);
    expect(rows.slice(0, 3).map((r) => r.scrapedAt!.getTime() > day(2).getTime())).toEqual([
      true,
      true,
      false,
    ]);
    expect(rows[3].scrapedAt).toBeNull();
  });

  it("is not shadowed by GET /:id and returns [] when there are no search rules", async () => {
    await seedAd();

    const res = await request(app).get("/amazon/ads/scrap").expect(200);

    expect(res.body).toEqual([]);
  });
});

describe("PUT /amazon/ads/:id", () => {
  it("stores prices, logs ad_scraped and posts a pricing error embed to Discord", async () => {
    const ad = await seedAd();
    const country = await seedCountry({ active: true });
    await seedPrice({ adId: ad.id, countryId: country.id, value: 100, createdAt: FIXED_DATE });

    await request(app)
      .put(`/amazon/ads/${ad.id}`)
      .send({ prices: [{ adId: ad.id, countryId: country.id, value: 40, dispatchFrom: "Amazon" }] })
      .expect(200);

    expect(await prisma.amazonAdPrice.count({ where: { adId: ad.id } })).toBe(2);
    expect(await prisma.log.count({ where: { event: "ad_scraped" } })).toBe(1);
    await vi.waitFor(() =>
      expect(messagesSentTo("DISCORD_PRICING_ERROR_TOKEN")).toHaveLength(1)
    );
    expect(await prisma.log.count({ where: { event: "pricing_error_sent" } })).toBe(1);
    expect(messagesSentTo("DISCORD_PRICING_ERROR_TOKEN")[0].options).toMatchObject({
      embeds: [{ title: ad.name, description: ad.asin }],
    });
  });
});

describe("CRUD /amazon/ads", () => {
  it("GET / lists ads and GET /:id returns one with its category", async () => {
    const category = await seedCategory({ name: "audio", active: true });
    const ad = await seedAd({ categoryId: category.id });

    const list = await request(app).get("/amazon/ads").expect(200);
    const one = await request(app).get(`/amazon/ads/${ad.id}`).expect(200);

    expect(list.body.map((a: { id: number }) => a.id)).toEqual([ad.id]);
    expect(one.body).toMatchObject({
      id: ad.id,
      asin: ad.asin,
      category: { id: category.id, name: "audio", active: true },
    });
  });

  it("GET /:id answers 500 with the Prisma code for a missing ad", async () => {
    const res = await request(app).get("/amazon/ads/999").expect(500);

    expect(res.text).toContain("P2025");
  });

  it("POST / creates one ad or many and rejects a duplicate asin with 422", async () => {
    const body = { asin: "B0HTTP0001", name: "Ad", image: "img", categoryName: "audio" };

    const one = await request(app).post("/amazon/ads").send(body).expect(200);
    const many = await request(app)
      .post("/amazon/ads")
      .send([
        { ...body, asin: "B0HTTP0002" },
        { ...body, asin: "B0HTTP0003" },
      ])
      .expect(200);
    const dup = await request(app).post("/amazon/ads").send(body).expect(422);

    expect(one.body).toMatchObject({ asin: "B0HTTP0001" });
    expect(many.body).toHaveLength(2);
    expect(await prisma.amazonAdCategory.count()).toBe(1);
    expect(dup.text).toMatch(/^Unique constraint failed on the/);
  });

  it("DELETE /:id removes the ad", async () => {
    const ad = await seedAd();

    await request(app).delete(`/amazon/ads/${ad.id}`).expect(200);

    expect(await prisma.amazonAd.count()).toBe(0);
  });
});
