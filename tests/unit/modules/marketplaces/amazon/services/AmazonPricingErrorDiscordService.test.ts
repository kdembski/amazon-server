import { describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import { AmazonPricingErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorDiscordService";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import { fakeDiscordService } from "../../../../../support/fakes";

describe("AmazonPricingErrorDiscordService", () => {
  it("renders price history oldest-first with a link on the newest price", async () => {
    const discord = fakeDiscordService();
    const service = new AmazonPricingErrorDiscordService(discord.service);
    const ad = buildAd({
      name: "Drill",
      asin: "B0X",
      image: "img",
      category: { id: 1, name: "tools", active: true },
    });
    const country = {
      name: "Germany",
      code: "de",
      currencyCode: "EUR",
    };
    const newest = buildListingPrice({
      value: 50,
      url: "https://www.amazon.de/dp/B0X",
      country,
      createdAt: new Date("2026-01-02T10:00:00"),
    });
    const older = buildListingPrice({
      value: 100,
      country,
      createdAt: new Date("2026-01-01T09:30:00"),
    });

    await service.send(ad, [[newest, older]]);

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
                `${newestDate} – [**50.00 EUR** *(-50%)*](https://www.amazon.de/dp/B0X)`,
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

    await new AmazonPricingErrorDiscordService(discord.service).send(buildAd(), [
      [buildListingPrice()],
    ]);

    expect(discord.send.mock.calls[0][0].embeds[0].color).toBe(0xe50000);
  });

  it("getDifference rounds the percentage to the next price and is undefined for the last one", () => {
    const service = new AmazonPricingErrorDiscordService(
      fakeDiscordService().service
    );
    const prices = [
      buildListingPrice({ value: 33 }),
      buildListingPrice({ value: 100 }),
    ];

    expect(service.getDifference(33, prices, 0)).toBe(-67);
    expect(service.getDifference(100, prices, 1)).toBeUndefined();
  });

  it("renders only price changes, dated when each price first appeared", async () => {
    const discord = fakeDiscordService();
    const service = new AmazonPricingErrorDiscordService(discord.service);
    const country = { name: "Germany", code: "de", currencyCode: "EUR" };
    const at = (hour: number) => new Date(2026, 0, 1, hour);
    const history = [
      [50, 14],
      [100, 12],
      [100, 10],
      [80, 9],
      [100, 8],
    ].map(([value, hour]) =>
      buildListingPrice({
        value,
        country,
        url: "https://www.amazon.de/dp/B0X",
        createdAt: at(hour),
      })
    );

    await service.send(buildAd({ asin: "B0X" }), [history]);

    const date = (hour: number) => format(at(hour), "d MMM HH:mm");
    expect(discord.send.mock.calls[0][0].embeds[0].fields[0].value).toBe(
      [
        `${date(8)} – **100.00 EUR**`,
        `${date(9)} – **80.00 EUR** *(-20%)*`,
        `${date(10)} – **100.00 EUR** *(25%)*`,
        `${date(14)} – [**50.00 EUR** *(-50%)*](https://www.amazon.de/dp/B0X)`,
      ].join("\n")
    );
  });

  it("getFullText omits the difference when it is missing or zero", () => {
    const service = new AmazonPricingErrorDiscordService(
      fakeDiscordService().service
    );

    expect(service.getFullText("**1.00 EUR**")).toBe("**1.00 EUR**");
    expect(service.getFullText("**1.00 EUR**", 0)).toBe("**1.00 EUR**");
    expect(service.getFullText("**1.00 EUR**", 12)).toBe(
      "**1.00 EUR** *(12%)*"
    );
  });
});
