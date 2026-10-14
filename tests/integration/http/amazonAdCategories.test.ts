import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { FIXED_DATE } from "../../support/factories";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedAd, seedCategory } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/amazon/ads/categories", () => {
  it("GET / lists categories and GET /scrap hands out the next one and stamps it", async () => {
    const scraped = await seedCategory({ scrapedAt: FIXED_DATE });
    const fresh = await seedCategory({ scrapedAt: null });

    const list = await request(app).get("/amazon/ads/categories").expect(200);
    const scrap = await request(app).get("/amazon/ads/categories/scrap").expect(200);

    expect(list.body.map((c: { id: number }) => c.id).sort((a: number, b: number) => a - b)).toEqual(
      [scraped.id, fresh.id].sort((a, b) => a - b)
    );
    expect(scrap.body.id).toBe(fresh.id);
    const row = await prisma.amazonAdCategory.findUniqueOrThrow({ where: { id: fresh.id } });
    expect(row.scrapedAt).not.toBeNull();
  });

  it("POST / creates (inactive by default) and rejects a duplicate name with 422", async () => {
    const created = await request(app)
      .post("/amazon/ads/categories")
      .send({ name: "audio" })
      .expect(200);
    const dup = await request(app)
      .post("/amazon/ads/categories")
      .send({ name: "audio" })
      .expect(422);

    expect(created.body).toMatchObject({ name: "audio", active: false, scrapedAt: null });
    expect(dup.text).toMatch(/^Unique constraint failed on the/);
  });

  it("PUT /:id renames and DELETE /:id removes the category with its ads", async () => {
    const category = await seedCategory({ name: "audio" });
    await seedAd({ categoryId: category.id });

    await request(app)
      .put(`/amazon/ads/categories/${category.id}`)
      .send({ name: "hifi" })
      .expect(200);
    const renamed = await prisma.amazonAdCategory.findUniqueOrThrow({ where: { id: category.id } });

    await request(app).delete(`/amazon/ads/categories/${category.id}`).expect(200);

    expect(renamed.name).toBe("hifi");
    expect(await prisma.amazonAdCategory.count()).toBe(0);
    expect(await prisma.amazonAd.count()).toBe(0);
  });
});
