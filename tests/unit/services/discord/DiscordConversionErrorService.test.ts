import { describe, expect, it, vi } from "vitest";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import {
  buildAd,
  buildPrice,
  buildPriceCountry,
} from "../../../support/factories";
import { fakeDiscordService } from "../../../support/fakes";

describe("DiscordConversionErrorService", () => {
  it("sends an embed with one field per country linking to the marketplace", async () => {
    const discord = fakeDiscordService();
    const service = new DiscordConversionErrorService(discord.service);
    const ad = buildAd({
      asin: "B0X",
      name: "Drill",
      image: "img",
      category: { id: 1, name: "tools", active: true },
    });
    const de = buildPrice({
      value: 12.344,
      country: buildPriceCountry({ name: "Germany", code: "de" }),
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

  it("uses the red color in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const discord = fakeDiscordService();

    await new DiscordConversionErrorService(discord.service).send(buildAd(), [
      buildPrice(),
    ]);

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
