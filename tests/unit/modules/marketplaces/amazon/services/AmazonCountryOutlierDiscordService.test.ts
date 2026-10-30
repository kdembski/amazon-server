import { describe, expect, it, vi } from "vitest";
import { AmazonCountryOutlierDiscordService } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierDiscordService";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import { fakeDiscordService } from "../../../../../support/fakes";

describe("AmazonCountryOutlierDiscordService", () => {
  it("sends an embed with one field per country linking to the marketplace", async () => {
    const discord = fakeDiscordService();
    const service = new AmazonCountryOutlierDiscordService(discord.service);
    const ad = buildAd({
      name: "Drill",
      asin: "B0X",
      image: "img",
      category: { id: 1, name: "tools", active: true },
    });
    const de = buildListingPrice({
      value: 12.344,
      url: "https://www.amazon.de/dp/B0X",
      country: { name: "Germany", code: "de", currencyCode: "EUR" },
    });

    await service.send(ad, [de]);

    expect(discord.send).toHaveBeenCalledWith({
      embeds: [
        {
          title: "Drill",
          description: "B0X",
          image: { url: "img", height: 200 },
          fields: [
            {
              name: "Germany",
              value: "[12.34 PLN](https://www.amazon.de/dp/B0X)",
            },
          ],
          footer: { text: "tools" },
          color: undefined,
        },
      ],
    });
  });

  it("shows the drop of the first price in percent", async () => {
    const discord = fakeDiscordService();
    const service = new AmazonCountryOutlierDiscordService(discord.service);
    const prices = [
      buildListingPrice({ value: 60, url: "de" }),
      buildListingPrice({ value: 100, url: "pl" }),
    ];

    await service.send(buildAd(), prices, -40);

    const values = discord.send.mock.calls[0][0].embeds[0].fields.map(
      (field: { value: string }) => field.value
    );
    expect(values).toEqual(["[60.00 PLN](de) *(-40%)*", "[100.00 PLN](pl)"]);
  });

  it("uses the red color in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const discord = fakeDiscordService();

    await new AmazonCountryOutlierDiscordService(discord.service).send(
      buildAd(),
      [buildListingPrice()]
    );

    expect(discord.send.mock.calls[0][0].embeds[0].color).toBe(0xe50000);
  });

  it("setChannel points the client at the matching env variable", () => {
    const discord = fakeDiscordService();

    new AmazonCountryOutlierDiscordService(discord.service).setChannel("4");

    expect(discord.clientSetter).toHaveBeenCalledWith(
      "DISCORD_COUNTRY_OUTLIER_4_TOKEN"
    );
  });
});
