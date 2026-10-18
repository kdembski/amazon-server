import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

const body = () => ({
  marketplace: "amazon",
  flow: "pdp",
  periodStart: "2026-10-18T10:00:00.000Z",
  metrics: [
    { metric: "requests", country: "de", outcome: "ok", value: 120 },
    { metric: "bytes_in", value: 1843200 },
  ],
});

describe("/scrapers", () => {
  it("POST /:name/metrics stores the metrics under the scraper name", async () => {
    const response = await request(app)
      .post("/scrapers/amazon-pdp/metrics")
      .send(body())
      .expect(200);

    expect(response.body).toEqual({ stored: 2 });
    const rows = await prisma.scraperMetric.findMany({ orderBy: { id: "asc" } });
    expect(rows).toMatchObject([
      {
        scraper: "amazon-pdp",
        marketplace: "amazon",
        flow: "pdp",
        metric: "requests",
        country: "de",
        outcome: "ok",
        value: 120,
        periodStart: new Date("2026-10-18T10:00:00.000Z"),
      },
      { scraper: "amazon-pdp", metric: "bytes_in", country: null, outcome: null },
    ]);
  });

  it("POST /:name/metrics rejects an invalid body with 400 and stores nothing", async () => {
    const invalid = { ...body(), metrics: [{ metric: "requests", value: -1 }] };

    await request(app)
      .post("/scrapers/amazon-pdp/metrics")
      .send(invalid)
      .expect(400);

    expect(await prisma.scraperMetric.count()).toBe(0);
  });

  it("POST /:name/status no longer exists", async () => {
    await request(app)
      .post("/scrapers/amazon-pdp/status")
      .send({ speed: 1, pending: 2 })
      .expect(404);
  });
});
