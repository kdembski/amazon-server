import { describe, expect, it } from "vitest";
import { AmazonPriceDropReporter } from "@/modules/marketplaces/amazon/services/AmazonPriceDropReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonPriceDropDiscordService,
  fakeActivityEventService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeActivityEventService();
  const discord = fakeAmazonPriceDropDiscordService();
  const reporter = new AmazonPriceDropReporter(log.service, discord.service);
  return { reporter, log, discord };
};

describe("AmazonPriceDropReporter", () => {
  it("logs the event with the newest price of each country and sends the embed", async () => {
    const { reporter, log, discord } = setup();
    const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
    const de = { code: "de", currencyCode: "EUR" };
    const uk = { code: "uk", currencyCode: "GBP" };
    const countryPrices = [
      [
        buildListingPrice({ value: 50, country: de }),
        buildListingPrice({ value: 100, country: de }),
      ],
      [
        buildListingPrice({ value: 40, country: uk }),
        buildListingPrice({ value: 90, country: uk }),
      ],
    ];

    await reporter.report(ad, countryPrices);

    expect(log.create).toHaveBeenCalledWith({
      type: "price_drop_sent",
      marketplace: "amazon",
      data: {
        asin: "B000TEST01",
        name: "Bosch drill",
        prices: [
          { country: "de", value: "50", currency: "EUR" },
          { country: "uk", value: "40", currency: "GBP" },
        ],
      },
    });
    expect(discord.send).toHaveBeenCalledWith(ad, countryPrices);
  });

  it("rejects when the embed cannot be sent", async () => {
    const { reporter, discord } = setup();
    discord.send.mockRejectedValue(new Error("no prices"));

    await expect(
      reporter.report(buildAd(), [[buildListingPrice()]])
    ).rejects.toThrow("no prices");
  });
});
