import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedAd } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

const logsOf = (source: string) => prisma.systemLog.findMany({ where: { source } });

describe("system log of http requests", () => {
  it("logs a successful admin write with its body", async () => {
    await request(app).post("/amazon/exclusion-rules").send({ value: "sony" }).expect(200);

    await vi.waitFor(async () =>
      expect(await logsOf("RequestLogMiddleware")).toEqual([
        expect.objectContaining({
          level: "info",
          message: "POST /amazon/exclusion-rules 200",
          context: {
            request: expect.objectContaining({
              method: "POST",
              body: { value: "sony" },
              status: 200,
            }),
          },
        }),
      ])
    );
  });

  it("does not log scraper writes", async () => {
    const ad = await seedAd();

    await request(app).put(`/amazon/ads/${ad.id}`).send({ prices: [] }).expect(200);
    await request(app).get("/amazon/ads/scrap").expect(200);
    await request(app).delete(`/amazon/ads/${ad.id}`).expect(200);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await logsOf("RequestLogMiddleware")).toEqual([]);
  });

  it("logs a failed request with the error and the request", async () => {
    await request(app).get("/amazon/ads/999").expect(500);

    await vi.waitFor(async () =>
      expect(await logsOf("ResponseErrorService")).toEqual([
        expect.objectContaining({
          level: "error",
          message: expect.stringMatching(/^GET \/amazon\/ads\/999 failed with 500: /),
          context: expect.objectContaining({
            error: expect.objectContaining({ code: "P2025" }),
            request: expect.objectContaining({ params: { id: "999" }, status: 500 }),
          }),
        }),
      ])
    );
  });

  it("answers invalid json with 400 and logs a warning", async () => {
    await request(app)
      .post("/amazon/exclusion-rules")
      .set("Content-Type", "application/json")
      .send("{bad")
      .expect(400);

    await vi.waitFor(async () =>
      expect(await logsOf("ResponseErrorService")).toEqual([
        expect.objectContaining({
          level: "warn",
          message: expect.stringMatching(/^POST \/amazon\/exclusion-rules failed with 400: /),
        }),
      ])
    );
  });
});
