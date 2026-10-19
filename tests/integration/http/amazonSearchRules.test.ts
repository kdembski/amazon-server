import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedAmazonSearchRule, seedCategory } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/amazon/search-rules", () => {
  it("POST /batch applies every change and returns all rules", async () => {
    const category = await seedCategory();
    const moved = await seedAmazonSearchRule({ value: "sony" });
    const removed = await seedAmazonSearchRule({ value: "bose" });

    const response = await request(app)
      .post("/amazon/search-rules/batch")
      .send({
        create: [{ value: "jbl", categoryId: category.id }],
        update: [{ id: moved.id, categoryId: category.id }],
        delete: [removed.id],
      })
      .expect(200);

    expect(
      response.body.map((r: { value: string; categoryId: number | null }) => [r.value, r.categoryId])
    ).toEqual([
      ["sony", category.id],
      ["jbl", category.id],
    ]);
  });

  it("POST /batch rejects an invalid rule with 400 and writes nothing", async () => {
    const rule = await seedAmazonSearchRule({ value: "sony" });

    await request(app)
      .post("/amazon/search-rules/batch")
      .send({ update: [{ id: rule.id, categoryId: null }], create: [{ value: "a +" }] })
      .expect(400);

    expect(await prisma.amazonSearchRule.count()).toBe(1);
  });

  it("POST /batch rejects an unknown category with 422 and writes nothing", async () => {
    const rule = await seedAmazonSearchRule({ value: "sony" });

    await request(app)
      .post("/amazon/search-rules/batch")
      .send({ delete: [rule.id], create: [{ value: "bose", categoryId: 999999 }] })
      .expect(422);

    expect(await prisma.amazonSearchRule.findMany()).toEqual([rule]);
  });
});
