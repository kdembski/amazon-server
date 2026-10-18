import { describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import { DiscordPricingErrorService } from "@/modules/anomalies/pricing-error/DiscordPricingErrorService";
import { buildListing, buildListingPrice } from "../../../../support/factories";
import { fakeDiscordService } from "../../../../support/fakes";

describe("DiscordPricingErrorService", () => {
  it("renders price history oldest-first with a link on the newest price", async () => {
    const discord = fakeDiscordService();
    const service = new DiscordPricingErrorService(discord.service);
    const listing = buildListing({
      name: "Drill",
      externalId: "B0X",
      image: "img",
      categoryName: "tools",
      getUrl: (code) => `https://shop.${code}/item/B0X`,
    });
    const country = {
      name: "Germany",
      code: "de",
      currencyCode: "EUR",
    };
    const newest = buildListingPrice({
      value: 50,
      country,
      createdAt: new Date("2026-01-02T10:00:00"),
    });
    const older = buildListingPrice({
      value: 100,
      country,
      createdAt: new Date("2026-01-01T09:30:00"),
    });

    await service.send(listing, [[newest, older]]);

    const newestDate = format(newest.createdAt, "d MMM HH:mm");
    const olderDate = format(older.createdAt, "d MMM HH:mm");
    expect(discord.send).toHaveBeenCalledWith({
      embeds: [
        {
          title: "Drill",
          description: "B0X",
          image: { url: "img", height: 200 },
          fields: [
            {
              name: "Germany",
              value: [
                `${olderDate} – **100.00 EUR**`,
                `${newestDate} – [**50.00 EUR** *(-50%)*](https://shop.de/item/B0X)`,
              ].join("\n"),
            },
          ],
          footer: { text: "tools" },
          color: undefined,
        },
      ],
    });
  });

  it("uses the red color in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const discord = fakeDiscordService();

    await new DiscordPricingErrorService(discord.service).send(buildListing(), [
      [buildListingPrice()],
    ]);

    expect(discord.send.mock.calls[0][0].embeds[0].color).toBe(0xe50000);
  });

  it("getDifference rounds the percentage to the next price and is undefined for the last one", () => {
    const service = new DiscordPricingErrorService(
      fakeDiscordService().service
    );
    const prices = [
      buildListingPrice({ value: 33 }),
      buildListingPrice({ value: 100 }),
    ];

    expect(service.getDifference(33, prices, 0)).toBe(-67);
    expect(service.getDifference(100, prices, 1)).toBeUndefined();
  });

  it("getFullText omits the difference when it is missing or zero", () => {
    const service = new DiscordPricingErrorService(
      fakeDiscordService().service
    );

    expect(service.getFullText("**1.00 EUR**")).toBe("**1.00 EUR**");
    expect(service.getFullText("**1.00 EUR**", 0)).toBe("**1.00 EUR**");
    expect(service.getFullText("**1.00 EUR**", 12)).toBe(
      "**1.00 EUR** *(12%)*"
    );
  });
});
