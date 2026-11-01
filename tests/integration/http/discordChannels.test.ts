import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../support/integration/app";
import { prisma } from "../../support/integration/db";

let app: Express;
beforeAll(() => {
  app = createTestApp();
});

describe("/discord-channels", () => {
  it("GET / lists the channels with masked tokens", async () => {
    const res = await request(app).get("/discord-channels").expect(200);

    expect(res.body.map((channel: { id: number }) => channel.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(res.body[0]).toMatchObject({ name: "channel-1", token: "…oken" });
  });

  it("POST / creates, PUT /:id renames and DELETE /:id removes an unused channel", async () => {
    const created = await request(app)
      .post("/discord-channels")
      .send({ name: "deals", token: "800/deals-secret" })
      .expect(200);
    expect(created.body).toMatchObject({ name: "deals", token: "…cret" });

    await request(app)
      .put(`/discord-channels/${created.body.id}`)
      .send({ name: "big-deals" })
      .expect(200);
    const stored = await prisma.discordChannel.findUniqueOrThrow({ where: { id: created.body.id } });
    expect([stored.name, stored.token]).toEqual(["big-deals", "800/deals-secret"]);

    await request(app).delete(`/discord-channels/${created.body.id}`).expect(200);
    expect(await prisma.discordChannel.count()).toBe(8);
  });

  it("answers 400 for an invalid token without logging it", async () => {
    const res = await request(app)
      .post("/discord-channels")
      .send({ name: "deals", token: "https://discord.com/api/webhooks/800/secret-token" })
      .expect(400);

    expect(res.text).toBe("Discord channel token must be the webhook URL part <id>/<token>");
    const logs = await prisma.systemLog.findMany({ where: { source: "ResponseErrorService" } });
    expect(JSON.stringify(logs.map((log) => log.context))).not.toContain("secret-token");
  });

  it("answers 422 for a duplicate name", async () => {
    await request(app)
      .post("/discord-channels")
      .send({ name: "channel-1", token: "800/x" })
      .expect(422);
  });

  it.each([
    [7, "priceDrop.channelId"],
    [8, "reports.channelId"],
  ])("DELETE /:id answers 422 for channel %s used by %s", async (id, key) => {
    const res = await request(app).delete(`/discord-channels/${id}`).expect(422);

    expect(res.text).toBe(`Discord channel ${id} is used by the settings ${key}`);
    expect(await prisma.discordChannel.count()).toBe(8);
  });
});
