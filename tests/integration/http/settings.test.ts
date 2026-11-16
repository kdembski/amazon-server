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
  it("GET / lists every setting with its value or null", async () => {
    await prisma.setting.delete({ where: { key: "priceDrop.ruleGroups" } });

    const res = await request(app).get("/settings").expect(200);

    expect(res.body).toContainEqual({ key: "countryOutlier.minPrices", value: 3 });
    expect(res.body).toContainEqual({ key: "priceDrop.ruleGroups", value: null });
  });

  it("PUT /:key stores a valid value", async () => {
    const updated = await request(app)
      .put("/settings/countryOutlier.minPrices")
      .send({ value: 4 })
      .expect(200);

    expect(updated.body).toEqual({ key: "countryOutlier.minPrices", value: 4 });
    expect(await prisma.setting.findUnique({ where: { key: "countryOutlier.minPrices" } })).toMatchObject({
      value: 4,
    });
  });

  it("PUT /:key answers 400 for an unknown key or an invalid value", async () => {
    const unknown = await request(app).put("/settings/nope").send({ value: 1 }).expect(400);
    expect(unknown.text).toBe('Unknown setting "nope"');

    const invalid = await request(app)
      .put("/settings/countryOutlier.ruleGroups")
      .send({ value: [[{ channelId: 99, belowMedianPercent: 50 }]] })
      .expect(400);
    expect(invalid.text).toContain("must be the id of an existing Discord channel");
  });

  it("PUT /countryOutlier.ruleGroups accepts a rule minPrices and rejects an invalid one", async () => {
    const value = [[{ channelId: 1, belowMedianPercent: 50, minPrices: 4 }]];
    const stored = await request(app).put("/settings/countryOutlier.ruleGroups").send({ value }).expect(200);
    expect(stored.body.value).toEqual(value);

    const invalid = await request(app)
      .put("/settings/countryOutlier.ruleGroups")
      .send({ value: [[{ channelId: 1, belowMedianPercent: 50, minPrices: 1 }]] })
      .expect(400);
    expect(invalid.text).toBe(
      'Setting "countryOutlier.ruleGroups"[0][0].minPrices must be an integer of at least 2'
    );
  });

  it("PUT /priceDrop.ruleGroups validates the rule groups; the removed keys are unknown", async () => {
    const value = [[{ channelId: 1, dropPercent: 70 }], [{ channelId: 2, dropPercent: 50 }]];
    const stored = await request(app).put("/settings/priceDrop.ruleGroups").send({ value }).expect(200);
    expect(stored.body.value).toEqual(value);

    const invalid = await request(app)
      .put("/settings/priceDrop.ruleGroups")
      .send({ value: [[{ channelId: 1, dropPercent: 0 }]] })
      .expect(400);
    expect(invalid.text).toBe(
      'Setting "priceDrop.ruleGroups"[0][0].dropPercent must be a number greater than 0 and at most 100'
    );

    await request(app).put("/settings/priceDrop.dropPercent").send({ value: 50 }).expect(400);
    await request(app).put("/settings/priceDrop.channelId").send({ value: 7 }).expect(400);
  });

  it("posts a price drop to every matched channel with all matched countries", async () => {
    const value = [[{ channelId: 1, dropPercent: 70 }], [{ channelId: 2, dropPercent: 50 }]];
    await request(app).put("/settings/priceDrop.ruleGroups").send({ value }).expect(200);
    const ad = await seedAd();
    const de = await seedAmazonCountry();
    const fr = await seedAmazonCountry();
    const hourAgo = new Date(Date.now() - 3_600_000);
    await seedPrice({ adId: ad.id, countryId: de.countryId, value: 100, createdAt: hourAgo });
    await seedPrice({ adId: ad.id, countryId: fr.countryId, value: 100, createdAt: hourAgo });

    await request(app)
      .put(`/amazon/ads/${ad.id}`)
      .send({
        prices: [
          { adId: ad.id, countryId: de.countryId, value: 20, dispatchFrom: "Amazon" },
          { adId: ad.id, countryId: fr.countryId, value: 40, dispatchFrom: "Amazon" },
        ],
      })
      .expect(200);

    await vi.waitFor(() => {
      expect(messagesSentToToken(discordChannelToken(1))).toHaveLength(1);
      expect(messagesSentToToken(discordChannelToken(2))).toHaveLength(1);
    });
    for (const id of [1, 2]) {
      const [message] = messagesSentToToken(discordChannelToken(id));
      expect((message.options as { embeds: { fields: unknown[] }[] }).embeds[0].fields).toHaveLength(2);
    }
    const events = await prisma.businessLog.findMany({ where: { type: "price_drop_sent" } });
    expect(events.map((event) => (event.data as { channel: string }).channel).sort()).toEqual(["1", "2"]);
    expect(messagesSentToToken(discordChannelToken(7))).toHaveLength(0);
  });

  it("a changed price drop rule applies to the next scrape at once", async () => {
    await request(app)
      .put("/settings/priceDrop.ruleGroups")
      .send({ value: [[{ channelId: 2, dropPercent: 30 }]] })
      .expect(200);
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

  it("skips price drops without the priceDrop.ruleGroups row", async () => {
    await prisma.setting.delete({ where: { key: "priceDrop.ruleGroups" } });
    const ad = await seedAd();
    const { countryId } = await seedAmazonCountry();
    await seedPrice({ adId: ad.id, countryId, value: 100, createdAt: new Date(Date.now() - 3_600_000) });

    await request(app)
      .put(`/amazon/ads/${ad.id}`)
      .send({ prices: [{ adId: ad.id, countryId, value: 10, dispatchFrom: "Amazon" }] })
      .expect(200);

    await vi.waitFor(async () => {
      expect(await prisma.systemLog.count({ where: { source: "SettingService", level: "error" } })).toBe(1);
    });
    expect(await prisma.businessLog.count({ where: { type: "price_drop_sent" } })).toBe(0);
  });
});
