import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedCurrency, seedPln, seedRate } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/currencies/rates", () => {
  it("POST / creates a rate, PUT /:id changes the value and DELETE /:id removes it", async () => {
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });

    const created = await request(app)
      .post("/currencies/rates")
      .send({ value: 4.3, sourceId: eur.id, targetId: pln.id })
      .expect(200);
    expect(created.body).toMatchObject({ sourceId: eur.id, targetId: pln.id, value: "4.3" });

    await request(app)
      .put(`/currencies/rates/${created.body.id}`)
      .send({ value: 4.5 })
      .expect(200);
    const updated = await prisma.currencyExchangeRate.findUniqueOrThrow({
      where: { id: created.body.id },
    });
    expect(updated.value.toString()).toBe("4.5");

    await request(app).delete(`/currencies/rates/${created.body.id}`).expect(200);
    expect(await prisma.currencyExchangeRate.count()).toBe(0);
  });

  it("POST / rejects a duplicate source/target pair with 422", async () => {
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    await seedRate({ sourceId: eur.id, targetId: pln.id });

    const res = await request(app)
      .post("/currencies/rates")
      .send({ value: 4.3, sourceId: eur.id, targetId: pln.id })
      .expect(422);

    expect(res.text).toMatch(/^Unique constraint failed on the/);
  });
});
