import { describe, expect, it, vi } from "vitest";
import { ConversionErrorManager } from "@/modules/anomalies/conversion-error/ConversionErrorManager";
import { ConversionErrorStrategy } from "@/modules/anomalies/conversion-error/ConversionErrorStrategy";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import {
  buildCurrency,
  buildListingPrice,
  buildRate,
} from "../../../../support/factories";

const setup = (channels = ["1", "4"]) => {
  const reporter = { report: vi.fn().mockResolvedValue(undefined) };
  const getPlnRates = vi.fn().mockResolvedValue([]);
  const getMatchingRules = vi
    .fn()
    .mockReturnValue(channels.map((channel) => ({ channel })));
  const manager = new ConversionErrorManager(
    reporter,
    { getPlnRates } as unknown as CurrencyExchangeRateService,
    { getMatchingRules } as unknown as ConversionErrorStrategy
  );
  return {
    manager,
    reporter,
    getPlnRates,
    getMatchingRules,
    listing: { id: 1 },
  };
};

const threeCountries = () => [
  [buildListingPrice()],
  [buildListingPrice()],
  [buildListingPrice()],
];

describe("ConversionErrorManager", () => {
  it("ignores listings with fewer than 3 countries", async () => {
    const { manager, getPlnRates, getMatchingRules, listing } = setup();

    await manager.check(listing, [
      [buildListingPrice(), buildListingPrice()],
      [buildListingPrice()],
    ]);

    expect(getPlnRates).not.toHaveBeenCalled();
    expect(getMatchingRules).not.toHaveBeenCalled();
  });

  it("matches rules on the newest prices converted to PLN and sorted ascending", async () => {
    const { manager, getPlnRates, getMatchingRules, listing } = setup();
    const eur = buildCurrency({ code: "EUR" });
    const pln = buildCurrency({ code: "PLN" });
    getPlnRates.mockResolvedValue([
      buildRate({ source: eur, target: pln, value: 4.5 }),
    ]);

    const eurPrice = buildListingPrice({
      value: 10,
      country: { currencyId: eur.id, currencyCode: "EUR" },
    });
    const plnPrice = buildListingPrice({
      value: 30,
      country: { currencyId: pln.id },
    });
    const otherPln = buildListingPrice({
      value: 100,
      country: { currencyId: pln.id },
    });

    await manager.check(listing, [
      [otherPln, buildListingPrice({ value: 1 })],
      [eurPrice],
      [plnPrice],
    ]);

    expect(getPlnRates).toHaveBeenCalled();
    const [matched] = getMatchingRules.mock.calls[0] as [ListingPrice[]];
    expect(matched.map((p) => p.value.toNumber())).toEqual([30, 45, 100]);
    expect(matched[0]).toBe(plnPrice);
    expect(matched[1]).toMatchObject({
      createdAt: eurPrice.createdAt,
      country: eurPrice.country,
    });
  });

  it("does not modify the given prices", async () => {
    const { manager, getPlnRates, listing } = setup();
    const eur = buildCurrency({ code: "EUR" });
    getPlnRates.mockResolvedValue([buildRate({ source: eur, value: 4.5 })]);
    const eurPrice = buildListingPrice({
      value: 10,
      country: { currencyId: eur.id, currencyCode: "EUR" },
    });
    const countryPrices = [
      [buildListingPrice({ value: 100 })],
      [eurPrice],
      [buildListingPrice({ value: 30 })],
    ];
    const order = countryPrices.map(([price]) => price);

    await manager.check(listing, countryPrices);

    expect(eurPrice.value.toNumber()).toBe(10);
    expect(countryPrices.map(([price]) => price)).toEqual(order);
  });

  it("reports every rule matched by the strategy", async () => {
    const { manager, reporter, getMatchingRules, listing } = setup([
      "2",
      "5",
    ]);

    await manager.check(listing, threeCountries());

    const [matched] = getMatchingRules.mock.calls[0];
    expect(reporter.report.mock.calls).toEqual([
      [listing, matched, "2"],
      [listing, matched, "5"],
    ]);
  });

  it("reports nothing when no rule matches", async () => {
    const { manager, reporter, listing } = setup([]);

    await manager.check(listing, threeCountries());

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("skips listings whose prices did not change since the previous scrape", async () => {
    const { manager, reporter, getMatchingRules, listing } = setup();
    const unchanged = (value: number) => [
      buildListingPrice({ value }),
      buildListingPrice({ value }),
    ];

    await manager.check(listing, [unchanged(10), unchanged(20), unchanged(30)]);

    expect(getMatchingRules).not.toHaveBeenCalled();
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it.each([
    ["one country changed", [buildListingPrice({ value: 25 })]],
    ["one country has no previous price", []],
  ])("checks the listing when %s", async (_, previous) => {
    const { manager, reporter, listing } = setup(["1"]);
    const unchanged = (value: number) => [
      buildListingPrice({ value }),
      buildListingPrice({ value }),
    ];

    await manager.check(listing, [
      unchanged(10),
      unchanged(20),
      [buildListingPrice({ value: 30 }), ...previous],
    ]);

    expect(reporter.report).toHaveBeenCalledTimes(1);
  });
});
