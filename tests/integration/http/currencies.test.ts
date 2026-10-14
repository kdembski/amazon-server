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

describe("/currencies", () => {
  it("POST / creates one or many currencies and GET / lists them", async () => {
    const one = await request(app)
      .post("/currencies")
      .send({ name: "Polish zloty", code: "PLN", symbol: "zł" })
      .expect(200);
    const many = await request(app)
      .post("/currencies")
      .send([
        { name: "Euro", code: "EUR", symbol: "€" },
        { name: "Swedish krona", code: "SEK", symbol: "kr" },
      ])
      .expect(200);
    const list = await request(app).get("/currencies").expect(200);

    expect(one.body).toMatchObject({ code: "PLN", symbol: "zł" });
    expect(many.body.map((c: { code: string }) => c.code)).toEqual(["EUR", "SEK"]);
    expect(list.body).toHaveLength(3);
  });

  it("POST / rejects a duplicate code with 422", async () => {
    await seedCurrency({ code: "PLN" });

    const res = await request(app)
      .post("/currencies")
      .send({ name: "Polish zloty", code: "PLN", symbol: "zł" })
      .expect(422);

    expect(res.text).toMatch(/^Unique constraint failed on the/);
  });

  it("PUT /:id updates and DELETE /:id removes the currency with its countries", async () => {
    const currency = await seedCurrency({ code: "EUR" });
    await seedCountry({ currencyId: currency.id });

    await request(app)
      .put(`/currencies/${currency.id}`)
      .send({ name: "Euro", code: "EUR", symbol: "€" })
      .expect(200);
    const updated = await prisma.currency.findUniqueOrThrow({ where: { id: currency.id } });

    await request(app).delete(`/currencies/${currency.id}`).expect(200);

    expect(updated.symbol).toBe("€");
    expect(await prisma.currency.count()).toBe(0);
    expect(await prisma.country.count()).toBe(0);
  });
});
