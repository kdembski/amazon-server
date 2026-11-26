import { describe, expect, it, vi } from "vitest";
import { AmazonPriceDropReporter } from "@/modules/marketplaces/amazon/services/AmazonPriceDropReporter";
import { AmazonDealCheckService } from "@/modules/marketplaces/amazon/services/AmazonDealCheckService";
import { buildAd, buildListingPrice } from "../../../../../support/factories";
import {
  fakeAmazonPriceDropDiscordService,
  fakeBusinessLogService,
} from "../../../../../support/fakes";

const setup = () => {
  const log = fakeBusinessLogService();
  const discord = fakeAmazonPriceDropDiscordService();
  const dealCheck = { check: vi.fn() };
  const reporter = new AmazonPriceDropReporter(
    log.service,
    discord.service,
    dealCheck as unknown as AmazonDealCheckService
  );
  return { reporter, log, discord, dealCheck };
};

describe("AmazonPriceDropReporter.checkDeal", () => {
  it("logs the event and passes the newest price of each country and the alert embed to the deal check without sending", async () => {
    const { reporter, log, discord, dealCheck } = setup();
    const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
    const de = { name: "Niemcy", code: "de", currencyCode: "EUR" };
    const countryPrices = [
      [
        buildListingPrice({ value: 10, url: "https://amazon.de/dp/X", country: de }),
        buildListingPrice({ value: 100, country: de }),
      ],
    ];

    await reporter.checkDeal(ad, countryPrices, 9);

    expect(discord.buildEmbed).toHaveBeenCalledWith(ad, countryPrices);
    expect(dealCheck.check).toHaveBeenCalledWith(
      ad,
      [{ country: "Niemcy", value: "10.00", currency: "EUR", url: "https://amazon.de/dp/X" }],
      { title: "alert" },
      9
    );
    expect(log.create).toHaveBeenCalledWith({
      type: "price_drop_sent",
      marketplace: "amazon",
      data: {
        asin: "B000TEST01",
        name: "Bosch drill",
        channel: "9",
        prices: [{ country: "de", value: "10", currency: "EUR" }],
      },
    });
    expect(discord.send).not.toHaveBeenCalled();
  });
});

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

    await reporter.report(ad, countryPrices, 7);

    expect(log.create).toHaveBeenCalledWith({
      type: "price_drop_sent",
      marketplace: "amazon",
      data: {
        asin: "B000TEST01",
        name: "Bosch drill",
        channel: "7",
        prices: [
          { country: "de", value: "50", currency: "EUR" },
          { country: "uk", value: "40", currency: "GBP" },
        ],
      },
    });
    expect(discord.send).toHaveBeenCalledWith(ad, countryPrices, 7);
  });

  it("rejects when the embed cannot be sent", async () => {
    const { reporter, discord } = setup();
    discord.send.mockRejectedValue(new Error("no prices"));

    await expect(
      reporter.report(buildAd(), [[buildListingPrice()]], 7)
    ).rejects.toThrow("no prices");
  });
});
