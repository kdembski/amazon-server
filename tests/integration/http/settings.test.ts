import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";
import { messagesSentToToken } from "../../support/integration/discordInbox";
import {
  discordChannelToken,
  seedAd,
  seedAmazonCountry,
  seedPrice,
} from "../../support/integration/seed";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/settings", () => {
  it("GET / lists every setting with its default", async () => {
    const res = await request(app).get("/settings").expect(200);

    expect(res.body).toContainEqual({ key: "countryOutlier.minPrices", value: 3, default: 3 });
    expect(res.body).toContainEqual({ key: "priceDrop.channelId", value: 7, default: 7 });
  });

  it("PUT /:key stores a valid value and DELETE /:key restores the default", async () => {
    const updated = await request(app)
      .put("/settings/countryOutlier.minPrices")
      .send({ value: 4 })
      .expect(200);
    expect(updated.body).toEqual({ key: "countryOutlier.minPrices", value: 4, default: 3 });
    expect(await prisma.setting.findUnique({ where: { key: "countryOutlier.minPrices" } })).toMatchObject({
      value: 4,
    });

    const reset = await request(app).delete("/settings/countryOutlier.minPrices").expect(200);
    expect(reset.body).toEqual({ key: "countryOutlier.minPrices", value: 3, default: 3 });
    expect(await prisma.setting.count()).toBe(0);
  });

  it("PUT /:key answers 400 for an unknown key or an invalid value", async () => {
    const unknown = await request(app).put("/settings/nope").send({ value: 1 }).expect(400);
    expect(unknown.text).toBe('Unknown setting "nope"');

    const invalid = await request(app)
      .put("/settings/countryOutlier.ruleGroups")
      .send({ value: [[{ channelId: 99, belowMedianPercent: 50 }]] })
      .expect(400);
    expect(invalid.text).toContain("must be the id of an existing Discord channel");
    expect(await prisma.setting.count()).toBe(0);
  });

  it("a changed price drop channel and threshold apply to the next scrape at once", async () => {
    await request(app).put("/settings/priceDrop.dropPercent").send({ value: 30 }).expect(200);
    await request(app).put("/settings/priceDrop.channelId").send({ value: 2 }).expect(200);
    const ad = await seedAd();
    const { countryId } = await seedAmazonCountry();
    await seedPrice({ adId: ad.id, countryId, value: 100, createdAt: new Date(Date.now() - 3_600_000) });

    await request(app)
      .put(`/amazon/ads/${ad.id}`)
      .send({ prices: [{ adId: ad.id, countryId, value: 70, dispatchFrom: "Amazon" }] })
      .expect(200);

    await vi.waitFor(() => expect(messagesSentToToken(discordChannelToken(2))).toHaveLength(1));
    expect(messagesSentToToken(discordChannelToken(7))).toHaveLength(0);
  });
});
