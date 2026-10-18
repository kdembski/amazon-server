import { describe, expect, it, vi } from "vitest";
import { DiscordConversionErrorService } from "@/modules/anomalies/conversion-error/DiscordConversionErrorService";
import { buildListing, buildListingPrice } from "../../../../support/factories";
import { fakeDiscordService } from "../../../../support/fakes";

describe("DiscordConversionErrorService", () => {
  it("sends an embed with one field per country linking to the marketplace", async () => {
    const discord = fakeDiscordService();
    const service = new DiscordConversionErrorService(discord.service);
    const listing = buildListing({
      name: "Drill",
      externalId: "B0X",
      image: "img",
      categoryName: "tools",
      getUrl: (code) => `https://shop.${code}/item/B0X`,
    });
    const de = buildListingPrice({
      value: 12.344,
      country: { name: "Germany", code: "de", currencyCode: "EUR" },
    });

    await service.send(listing, [de]);

    expect(discord.send).toHaveBeenCalledWith({
      embeds: [
        {
          title: "Drill",
          description: "B0X",
          image: { url: "img", height: 200 },
          fields: [
            {
              name: "Germany",
              value: "[12.34 PLN](https://shop.de/item/B0X)",
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

    await new DiscordConversionErrorService(discord.service).send(
      buildListing(),
      [buildListingPrice()]
    );

    expect(discord.send.mock.calls[0][0].embeds[0].color).toBe(0xe50000);
  });

  it("setChannel points the client at the matching env variable", () => {
    const discord = fakeDiscordService();

    new DiscordConversionErrorService(discord.service).setChannel("4");

    expect(discord.clientSetter).toHaveBeenCalledWith(
      "DISCORD_CONVERSION_ERROR_4_TOKEN"
    );
  });
});
