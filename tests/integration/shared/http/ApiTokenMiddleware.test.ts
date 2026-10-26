import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { seedCategory } from "../../../support/integration/seed";

describe("ApiTokenMiddleware", () => {
  it("answers 401 without a valid bearer token and serves the route with it", async () => {
    await seedCategory();
    const app = createApp();

    const missing = await request(app).get("/amazon/ads/categories").expect(401);
    await request(app)
      .get("/amazon/ads/categories")
      .set("Authorization", "Bearer wrong")
      .expect(401);
    const ok = await request(app)
      .get("/amazon/ads/categories")
      .set("Authorization", "Bearer api-token")
      .expect(200);

    expect(missing.text).toBe("Invalid API token");
    expect(ok.body).toHaveLength(1);
  });
});
