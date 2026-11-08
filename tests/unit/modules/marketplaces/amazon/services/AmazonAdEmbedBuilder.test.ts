import { afterEach, describe, expect, it, vi } from "vitest";
import { AmazonAdEmbedBuilder } from "@/modules/marketplaces/amazon/services/AmazonAdEmbedBuilder";
import { buildAd } from "../../../../../support/factories";

describe("AmazonAdEmbedBuilder", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows the ad with its image, category and the fields", () => {
    vi.stubEnv("NODE_ENV", "production");
    const ad = buildAd();
    const fields = [{ name: "Germany", value: "1 PLN" }];

    expect(new AmazonAdEmbedBuilder().build(ad, fields)).toEqual({
      title: ad.name,
      description: ad.asin,
      image: { url: ad.image, height: 200 },
      fields,
      footer: { text: ad.category.name },
      color: undefined,
    });
  });

  it("colors the embed red in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(new AmazonAdEmbedBuilder().build(buildAd(), []).color).toBe(0xe50000);
  });
});
