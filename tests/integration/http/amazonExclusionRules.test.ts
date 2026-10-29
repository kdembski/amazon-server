import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedAmazonExclusionRule, seedCategory } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/amazon/exclusion-rules", () => {
  it("POST /batch applies every change and returns all rules", async () => {
    const category = await seedCategory();
    const moved = await seedAmazonExclusionRule({ value: "sony" });
    const removed = await seedAmazonExclusionRule({ value: "bose" });

    const response = await request(app)
      .post("/amazon/exclusion-rules/batch")
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
    const rule = await seedAmazonExclusionRule({ value: "sony" });

    await request(app)
      .post("/amazon/exclusion-rules/batch")
      .send({ update: [{ id: rule.id, categoryId: null }], create: [{ value: "a +" }] })
      .expect(400);

    expect(await prisma.amazonExclusionRule.count()).toBe(1);
  });

  it("POST / rejects a rule made only of ! members with 400", async () => {
    await request(app).post("/amazon/exclusion-rules").send({ value: "!etui" }).expect(400);

    expect(await prisma.amazonExclusionRule.count()).toBe(0);
  });

  it("POST / stores an inverted rule of a category and rejects one without a category with 400", async () => {
    const category = await seedCategory();

    const response = await request(app)
      .post("/amazon/exclusion-rules")
      .send({ value: "rtx + 4090", categoryId: category.id, inverted: true })
      .expect(200);
    await request(app)
      .post("/amazon/exclusion-rules")
      .send({ value: "rtx", inverted: true })
      .expect(400);

    expect(response.body).toMatchObject({ categoryId: category.id, inverted: true });
    expect(await prisma.amazonExclusionRule.count()).toBe(1);
  });

  it("POST /batch rejects an unknown category with 422 and writes nothing", async () => {
    const rule = await seedAmazonExclusionRule({ value: "sony" });

    await request(app)
      .post("/amazon/exclusion-rules/batch")
      .send({ delete: [rule.id], create: [{ value: "bose", categoryId: 999999 }] })
      .expect(422);

    expect(await prisma.amazonExclusionRule.findMany()).toEqual([rule]);
  });
});
