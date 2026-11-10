import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedAdMissing, seedAmazonCountry, seedAmazonCountryRoute } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

const route = { priority: 3, proxyType: "direct", pdpSource: "aod", maxAttempts: 6 };

describe("/amazon/countries/routes", () => {
  it("POST / creates a route, GET / lists it and PUT /:id changes it", async () => {
    const { countryId } = await seedAmazonCountry();

    const created = await request(app)
      .post("/amazon/countries/routes")
      .send({ countryId, ...route })
      .expect(200);
    expect(created.body).toMatchObject({ countryId, ...route });

    const list = await request(app).get("/amazon/countries/routes").expect(200);
    expect(list.body.map((r: { id: number }) => r.id)).toEqual([created.body.id]);

    await request(app)
      .put(`/amazon/countries/routes/${created.body.id}`)
      .send({ priority: 1, proxyType: "datacenter", pdpSource: "twister", maxAttempts: 8 })
      .expect(200);
    expect(await prisma.amazonCountryRoute.findUniqueOrThrow({ where: { id: created.body.id } })).toMatchObject({
      priority: 1,
      proxyType: "datacenter",
      pdpSource: "twister",
      maxAttempts: 8,
    });
  });

  it("POST / rejects an invalid route with 400", async () => {
    const { countryId } = await seedAmazonCountry();

    await request(app)
      .post("/amazon/countries/routes")
      .send({ countryId, ...route, pdpSource: "twister,awd" })
      .expect(400);
    expect(await prisma.amazonCountryRoute.count()).toBe(0);
  });

  it("POST / rejects a second route with the same country and priority with 422", async () => {
    const { countryId } = await seedAmazonCountryRoute({ priority: 3 });

    await request(app)
      .post("/amazon/countries/routes")
      .send({ countryId, ...route })
      .expect(422);
  });

  it("DELETE /:id removes the route with its missing rows", async () => {
    const missing = await seedAdMissing();

    await request(app).delete(`/amazon/countries/routes/${missing.routeId}`).expect(200);

    expect(await prisma.amazonCountryRoute.count()).toBe(0);
    expect(await prisma.amazonAdMissing.count()).toBe(0);
  });
});
