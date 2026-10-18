import { describe, expect, it } from "vitest";
import { AmazonConversionErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonConversionErrorDiscordService,
  fakeLogService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeLogService();
  const discord = fakeAmazonConversionErrorDiscordService();
  const reporter = new AmazonConversionErrorReporter(
    log.service,
    discord.service
  );
  return { reporter, log, discord };
};

describe("AmazonConversionErrorReporter", () => {
  it("logs the event and sends the embed to the rule's channel", async () => {
    const { reporter, log, discord } = setup();
    const ad = buildAd();
    const prices = [buildListingPrice({ value: 412.5 })];

    await reporter.report(ad, prices, "3");

    expect(log.create).toHaveBeenCalledWith({
      event: "conversion_error_3_sent",
    });
    expect(discord.setChannel).toHaveBeenCalledWith("3");
    expect(discord.send).toHaveBeenCalledWith(ad, prices);
  });
});
