import { describe, expect, it } from "vitest";
import { AmazonConversionErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonConversionErrorDiscordService,
  fakeActivityEventService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeActivityEventService();
  const discord = fakeAmazonConversionErrorDiscordService();
  const reporter = new AmazonConversionErrorReporter(
    log.service,
    discord.service
  );
  return { reporter, log, discord };
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

  it("rejects when the embed cannot be sent", async () => {
    const { reporter, discord } = setup();
    discord.send.mockRejectedValue(new Error("no client"));

    await expect(
      reporter.report(buildAd(), [buildListingPrice()], "1")
    ).rejects.toThrow("no client");
  });
});
