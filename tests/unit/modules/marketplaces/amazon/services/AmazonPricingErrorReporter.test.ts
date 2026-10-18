import { describe, expect, it } from "vitest";
import { AmazonPricingErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonPricingErrorDiscordService,
  fakeActivityEventService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeActivityEventService();
  const discord = fakeAmazonPricingErrorDiscordService();
  const reporter = new AmazonPricingErrorReporter(log.service, discord.service);
  return { reporter, log, discord };
};

describe("AmazonPricingErrorReporter", () => {
  it("logs the event with the newest price of each country and sends the embed", async () => {
    const { reporter, log, discord } = setup();
    const ad = buildAd({ asin: "B000TEST01" });
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
      type: "pricing_error_sent",
      marketplace: "amazon",
      data: {
        asin: "B000TEST01",
        prices: [
          { country: "de", value: "50", currency: "EUR" },
          { country: "uk", value: "40", currency: "GBP" },
        ],
      },
    });
    expect(discord.send).toHaveBeenCalledWith(ad, countryPrices);
  });
});
