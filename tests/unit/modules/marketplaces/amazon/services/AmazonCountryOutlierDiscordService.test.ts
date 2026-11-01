import { describe, expect, it, vi } from "vitest";
import { AmazonCountryOutlierDiscordService } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierDiscordService";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import { fakeDiscordChannelService } from "../../../../../support/fakes";

describe("AmazonCountryOutlierDiscordService", () => {
  it("sends an embed with one field per country linking to the marketplace", async () => {
    const discord = fakeDiscordChannelService();
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

    await service.send(3, ad, [de]);

    expect(discord.send).toHaveBeenCalledWith(3, {
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
    }, { asin: "B0X" });
  });

  it("shows the drop of the first price in percent", async () => {
    const discord = fakeDiscordChannelService();
    const service = new AmazonCountryOutlierDiscordService(discord.service);
    const prices = [
      buildListingPrice({ value: 60, url: "de" }),
      buildListingPrice({ value: 100, url: "pl" }),
    ];

    await service.send(1, buildAd(), prices, -40);

    const values = discord.send.mock.calls[0][1].embeds[0].fields.map(
      (field: { value: string }) => field.value
    );
    expect(values).toEqual(["[60.00 PLN](de) *(-40%)*", "[100.00 PLN](pl)"]);
  });

  it("uses the red color in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const discord = fakeDiscordChannelService();

    await new AmazonCountryOutlierDiscordService(discord.service).send(
      1,
      buildAd(),
      [buildListingPrice()]
    );

    expect(discord.send.mock.calls[0][1].embeds[0].color).toBe(0xe50000);
  });
});
