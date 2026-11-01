import { describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { AmazonCountryOutlierReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierReportRepository";
import { AmazonCountryOutlierReporter } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierReporter";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonCountryOutlierDiscordService,
  fakeBusinessLogService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeBusinessLogService();
  const discord = fakeAmazonCountryOutlierDiscordService();
  const repository = {
    getValue: vi.fn().mockResolvedValue(new Decimal(95)),
    set: vi.fn().mockResolvedValue(undefined),
  };
  const reporter = new AmazonCountryOutlierReporter(
    log.service,
    discord.service,
    repository as unknown as AmazonCountryOutlierReportRepository
  );
  return { reporter, log, discord, repository };
};

describe("AmazonCountryOutlierReporter", () => {
  it("logs the event with the PLN prices and sends the embed to the rule's channel", async () => {
    const { reporter, log, discord } = setup();
    const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
    const prices = [
      buildListingPrice({ value: 412.5, country: { code: "de" } }),
      buildListingPrice({ value: 500, country: { code: "pl" } }),
    ];

    await reporter.report(ad, prices, 3, -40);

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
    expect(discord.send).toHaveBeenCalledWith(3, ad, prices, -40);
  });

  it("reads and stores the reported price by ad and country", async () => {
    const { reporter, repository } = setup();
    const ad = buildAd();
    const price = buildListingPrice({ value: 90, country: { id: 3 } });

    expect(await reporter.getReportedPrice(ad, price)).toEqual(new Decimal(95));
    await reporter.setReportedPrice(ad, price);

    expect(repository.getValue).toHaveBeenCalledWith(ad.id, 3);
    expect(repository.set).toHaveBeenCalledWith(ad.id, 3, price.value);
  });

  it("rejects when the embed cannot be sent", async () => {
    const { reporter, discord } = setup();
    discord.send.mockRejectedValue(new Error("no client"));

    await expect(
      reporter.report(buildAd(), [buildListingPrice()], 1)
    ).rejects.toThrow("no client");
  });
});
