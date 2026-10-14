import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedAd, seedCountry } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/amazon/ads/prices", () => {
  it("POST / creates, PUT /:id changes the value and DELETE /:id removes the price", async () => {
    const ad = await seedAd();
    const country = await seedCountry();

    const created = await request(app)
      .post("/amazon/ads/prices")
      .send({ adId: ad.id, countryId: country.id, value: 99.99, dispatchFrom: "Amazon" })
      .expect(200);
    // Decimal serialises to a string in JSON.
    expect(created.body).toMatchObject({
      adId: ad.id,
      countryId: country.id,
      value: "99.99",
      dispatchFrom: "Amazon",
    });

    await request(app)
      .put(`/amazon/ads/prices/${created.body.id}`)
      .send({ value: 49.5, adId: ad.id, countryId: country.id })
      .expect(200);
    const updated = await prisma.amazonAdPrice.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(updated.value.toString()).toBe("49.5");

    await request(app).delete(`/amazon/ads/prices/${created.body.id}`).expect(200);
    expect(await prisma.amazonAdPrice.count()).toBe(0);
  });

  it("POST / with an unknown country answers 500 with the Prisma code", async () => {
    const ad = await seedAd();

    const res = await request(app)
      .post("/amazon/ads/prices")
      .send({ adId: ad.id, countryId: 999, value: 1, dispatchFrom: "Amazon" })
      .expect(500);

    expect(res.text).toContain("P2025");
  });
});
