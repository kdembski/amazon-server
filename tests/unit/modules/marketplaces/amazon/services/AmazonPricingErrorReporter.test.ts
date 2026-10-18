import { describe, expect, it } from "vitest";
import { AmazonPricingErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonPricingErrorDiscordService,
  fakeLogService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeLogService();
  const discord = fakeAmazonPricingErrorDiscordService();
  const reporter = new AmazonPricingErrorReporter(log.service, discord.service);
  return { reporter, log, discord };
};

describe("AmazonPricingErrorReporter", () => {
  it("logs the event and sends the embed", async () => {
    const { reporter, log, discord } = setup();
    const ad = buildAd();
    const countryPrices = [
      [buildListingPrice({ value: 50 }), buildListingPrice({ value: 100 })],
    ];

    await reporter.report(ad, countryPrices);

    expect(log.create).toHaveBeenCalledWith({ event: "pricing_error_sent" });
    expect(discord.send).toHaveBeenCalledWith(ad, countryPrices);
  });
});
