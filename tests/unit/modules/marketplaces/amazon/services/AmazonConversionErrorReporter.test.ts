import { describe, expect, it } from "vitest";
import { AmazonConversionErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonAdRepository,
  fakeAmazonConversionErrorDiscordService,
  fakeActivityEventService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeActivityEventService();
  const discord = fakeAmazonConversionErrorDiscordService();
  const ads = fakeAmazonAdRepository();
  const reporter = new AmazonConversionErrorReporter(
    log.service,
    discord.service,
    ads.repository
  );
  return { reporter, log, discord, ads };
};

describe("AmazonConversionErrorReporter", () => {
  it("logs the event with the PLN prices and sends the embed to the rule's channel", async () => {
    const { reporter, log, discord } = setup();
    const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
    const prices = [
      buildListingPrice({ value: 412.5, country: { code: "de" } }),
      buildListingPrice({ value: 500, country: { code: "pl" } }),
    ];

    await reporter.report(ad, prices, "3");

    expect(log.create).toHaveBeenCalledWith({
      type: "conversion_error_sent",
      marketplace: "amazon",
      data: {
        asin: "B000TEST01",
        name: "Bosch drill",
        channel: "3",
        prices: [
          { country: "de", value: "412.5" },
          { country: "pl", value: "500" },
        ],
      },
    });
    expect(discord.setChannel).toHaveBeenCalledWith("3");
    expect(discord.send).toHaveBeenCalledWith(ad, prices);
  });

  it("delays the next scraping of the ad by 24 hours", async () => {
    const { reporter, ads } = setup();
    const ad = buildAd();

    await reporter.report(ad, [buildListingPrice()], "1");

    expect(ads.delayScraping).toHaveBeenCalledWith(ad.id, 24);
  });
});
