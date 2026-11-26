import { describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
import { AmazonCountryOutlierReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierReportRepository";
import { AmazonCountryOutlierReporter } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierReporter";
import { AmazonDealCheckService } from "@/modules/marketplaces/amazon/services/AmazonDealCheckService";
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
  const dealCheck = { check: vi.fn() };
  const reporter = new AmazonCountryOutlierReporter(
    log.service,
    discord.service,
    repository as unknown as AmazonCountryOutlierReportRepository,
    dealCheck as unknown as AmazonDealCheckService
  );
  return { reporter, log, discord, repository, dealCheck };
};

describe("AmazonCountryOutlierReporter.checkDeal", () => {
  it("logs the event and passes the PLN prices and the alert embed to the deal check without sending", async () => {
    const { reporter, log, discord, dealCheck } = setup();
    const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
    const prices = [
      buildListingPrice({
        value: 49.21246953,
        url: "https://amazon.se/dp/X",
        country: { name: "Szwecja", code: "se" },
      }),
      buildListingPrice({ value: 200, url: "https://amazon.pl/dp/X", country: { name: "Polska", code: "pl" } }),
    ];

    await reporter.checkDeal(ad, prices, 10, -50);

    expect(discord.buildEmbed).toHaveBeenCalledWith(ad, prices, -50);
    expect(dealCheck.check).toHaveBeenCalledWith(
      ad,
      [
        { country: "Szwecja", value: "49.21", currency: "PLN", url: "https://amazon.se/dp/X" },
        { country: "Polska", value: "200.00", currency: "PLN", url: "https://amazon.pl/dp/X" },
      ],
      { title: "alert" },
      10
    );
    expect(log.create).toHaveBeenCalledWith({
      type: "country_outlier_sent",
      marketplace: "amazon",
      data: {
        asin: "B000TEST01",
        name: "Bosch drill",
        channel: "10",
        prices: [
          { country: "se", value: "49.21246953" },
          { country: "pl", value: "200" },
        ],
      },
    });
    expect(discord.send).not.toHaveBeenCalled();
  });
});

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
