import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedCountry, seedCurrency } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/countries", () => {
  it("POST / creates a country for a currency, GET / lists it, PUT /:id and DELETE /:id work", async () => {
    const pln = await seedCurrency({ code: "PLN" });
    const eur = await seedCurrency({ code: "EUR" });

    const created = await request(app)
      .post("/countries")
      .send({ name: "Poland", code: "pl", currencyId: pln.id })
      .expect(200);
    expect(created.body).toMatchObject({ name: "Poland", code: "pl", currencyId: pln.id });

    const list = await request(app).get("/countries").expect(200);
    expect(list.body.map((c: { id: number }) => c.id)).toEqual([created.body.id]);

    await request(app)
      .put(`/countries/${created.body.id}`)
      .send({ name: "Polska", code: "pl", currencyId: eur.id })
      .expect(200);
    const updated = await prisma.country.findUniqueOrThrow({ where: { id: created.body.id } });
    expect([updated.name, updated.currencyId]).toEqual(["Polska", eur.id]);

    await request(app).delete(`/countries/${created.body.id}`).expect(200);
    expect(await prisma.country.count()).toBe(0);
  });

  it("POST / rejects a duplicate code with 422", async () => {
    const country = await seedCountry({ code: "pl" });

    const res = await request(app)
      .post("/countries")
      .send({ name: "Poland", code: "pl", currencyId: country.currencyId })
      .expect(422);

    expect(res.text).toMatch(/^Unique constraint failed on the/);
  });
});
