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

  it("POST /:name/metrics rejects a 64 character scraper name with 400 and stores nothing", async () => {
    await request(app)
      .post(`/scrapers/${"n".repeat(64)}/metrics`)
      .send(body())
      .expect(400);

    expect(await prisma.scraperMetric.count()).toBe(0);
  });

  it("GET /:name/config returns the stored config of the scraper", async () => {
    await prisma.scraperConfig.create({
      data: { scraper: "amazon-pdp-1", concurrency: 150, rps: 150, batchSize: 5000 },
    });

    const response = await request(app).get("/scrapers/amazon-pdp-1/config").expect(200);

    expect(response.body).toEqual({ concurrency: 150, rps: 150, batchSize: 5000 });
  });

  it("GET /:name/config creates a row with defaults for an unknown scraper", async () => {
    const response = await request(app).get("/scrapers/amazon-new/config").expect(200);

    expect(response.body).toEqual({ concurrency: 10, rps: 0, batchSize: 50 });
    expect(await prisma.scraperConfig.count()).toBe(1);
  });

  it("POST /:name/status no longer exists", async () => {
    await request(app)
      .post("/scrapers/amazon-pdp/status")
      .send({ speed: 1, pending: 2 })
      .expect(404);
  });
});
