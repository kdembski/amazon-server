import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { seedActivityEvent } from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

const range = { from: "2026-10-26T10:00:00.000Z", to: "2026-10-26T12:00:00.000Z" };

describe("/stats", () => {
  it("GET /activity answers 400 for an invalid range", async () => {
    const response = await request(app).get("/stats/activity").query({ from: "x" }).expect(400);

    expect(response.text).toContain("from and to must be ISO dates");
  });

  it("GET /activity returns hourly series and totals of the range and the previous one", async () => {
    await seedActivityEvent({ data: { count: 3 }, createdAt: new Date("2026-10-26T10:15:00Z") });
    await seedActivityEvent({ data: { count: 5 }, createdAt: new Date("2026-10-26T09:00:00Z") });

    const response = await request(app).get("/stats/activity").query(range).expect(200);

    expect(response.body).toEqual({
      series: [
        {
          type: "ad_scraped",
          channel: null,
          points: [{ t: "2026-10-26T10:00:00.000Z", value: 3 }],
        },
      ],
      totals: { ad_scraped: 3, country_outlier_sent: 0, price_drop_sent: 0 },
      previousTotals: { ad_scraped: 5, country_outlier_sent: 0, price_drop_sent: 0 },
    });
  });

  it("GET /logs returns hourly error and warning counts and the top sources", async () => {
    await prisma.systemLog.create({
      data: { level: "error", source: "A", message: "m", createdAt: new Date("2026-10-26T11:30:00Z") },
    });

    const response = await request(app).get("/stats/logs").query(range).expect(200);

    expect(response.body).toEqual({
      series: [
        { level: "error", points: [{ t: "2026-10-26T11:00:00.000Z", value: 1 }] },
        { level: "warn", points: [] },
      ],
      totals: { error: 1, warn: 0 },
      previousTotals: { error: 0, warn: 0 },
      topSources: [{ source: "A", error: 1, warn: 0 }],
    });
  });
});
