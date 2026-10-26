import { describe, expect, it } from "vitest";
import { AmazonCountryOutlierReporter } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonCountryOutlierDiscordService,
  fakeActivityEventService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeActivityEventService();
  const discord = fakeAmazonCountryOutlierDiscordService();
  const reporter = new AmazonCountryOutlierReporter(
    log.service,
    discord.service
  );
  return { reporter, log, discord };
};

describe("AmazonCountryOutlierReporter", () => {
  it("logs the event with the PLN prices and sends the embed to the rule's channel", async () => {
    const { reporter, log, discord } = setup();
    const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
    const prices = [
      buildListingPrice({ value: 412.5, country: { code: "de" } }),
      buildListingPrice({ value: 500, country: { code: "pl" } }),
    ];

    await reporter.report(ad, prices, "3");

    expect(log.create).toHaveBeenCalledWith({
      type: "country_outlier_sent",
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
