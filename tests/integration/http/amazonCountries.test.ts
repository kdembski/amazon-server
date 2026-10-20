import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedAmazonCountry, seedCountry } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/amazon/countries", () => {
  it("POST / creates an Amazon country, GET / lists it and PUT /:id changes it by country id", async () => {
    const country = await seedCountry({ code: "be" });

    const created = await request(app)
      .post("/amazon/countries")
      .send({ countryId: country.id, tld: "com.be", scraped: false, active: false })
      .expect(200);
    expect(created.body).toMatchObject({
      countryId: country.id,
      tld: "com.be",
      scraped: false,
      active: false,
    });

    const list = await request(app).get("/amazon/countries").expect(200);
    expect(list.body.map((c: { countryId: number }) => c.countryId)).toEqual([country.id]);

    await request(app)
      .put(`/amazon/countries/${country.id}`)
      .send({ tld: "com.be", scraped: true, active: true })
      .expect(200);
    const updated = await prisma.amazonCountry.findUniqueOrThrow({ where: { countryId: country.id } });
    expect([updated.scraped, updated.active]).toEqual([true, true]);
  });

  it("GET /scrap hands out only scraped countries with their tld", async () => {
    const scraped = await seedAmazonCountry({ tld: "de", scraped: true });
    await seedAmazonCountry({ tld: "ie", scraped: false });

    const res = await request(app).get("/amazon/countries/scrap").expect(200);

    expect(res.body).toEqual([{ countryId: scraped.countryId, tld: "de" }]);
  });

  it("does not expose DELETE /:id", async () => {
    const { countryId } = await seedAmazonCountry();

    await request(app).delete(`/amazon/countries/${countryId}`).expect(404);
    expect(await prisma.amazonCountry.count()).toBe(1);
  });

  it("POST / rejects a second row for the same country with 422", async () => {
    const { countryId } = await seedAmazonCountry();

    await request(app)
      .post("/amazon/countries")
      .send({ countryId, tld: "pl", scraped: true, active: true })
      .expect(422);
  });
});
