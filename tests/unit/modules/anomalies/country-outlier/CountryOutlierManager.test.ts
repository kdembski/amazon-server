import { describe, expect, it, vi } from "vitest";
import { CountryOutlierManager } from "@/modules/anomalies/country-outlier/CountryOutlierManager";
import { CountryOutlierStrategy } from "@/modules/anomalies/country-outlier/CountryOutlierStrategy";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import {
  buildCurrency,
  buildListingPrice,
  buildRate,
} from "../../../../support/factories";
import { fakeSystemLogService } from "../../../../support/fakes";

const setup = (channels = ["1", "4"]) => {
  const reporter = { report: vi.fn().mockResolvedValue(undefined) };
  const getPlnRates = vi.fn().mockResolvedValue([]);
  const getMatchingRules = vi
    .fn()
    .mockReturnValue(channels.map((channel) => ({ channel })));
  const manager = new CountryOutlierManager(
    reporter,
    { getPlnRates } as unknown as CurrencyExchangeRateService,
    { getMatchingRules } as unknown as CountryOutlierStrategy
  );
  return {
    manager,
    reporter,
    getPlnRates,
    getMatchingRules,
    listing: { id: 1 },
  };
};

const fourCountries = () => [
  [buildListingPrice()],
  [buildListingPrice()],
  [buildListingPrice()],
  [buildListingPrice()],
];

describe("CountryOutlierManager", () => {
  it("ignores listings with fewer than 4 countries", async () => {
    const { manager, getPlnRates, getMatchingRules, listing } = setup();

    await manager.check(listing, [
      [buildListingPrice(), buildListingPrice()],
      [buildListingPrice()],
      [buildListingPrice()],
    ]);

    expect(getPlnRates).not.toHaveBeenCalled();
    expect(getMatchingRules).not.toHaveBeenCalled();
  });

  it("ignores countries missing from the scrape", async () => {
    const { manager, getMatchingRules, listing } = setup();

    await manager.check(listing, [
      ...fourCountries().slice(1),
      [buildListingPrice({ scraped: false })],
    ]);

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
      [buildListingPrice({ value: 200, country: { currencyId: pln.id } })],
    ]);

    expect(getPlnRates).toHaveBeenCalled();
    const [matched] = getMatchingRules.mock.calls[0] as [ListingPrice[]];
    expect(matched.map((p) => p.value.toNumber())).toEqual([30, 45, 100, 200]);
    expect(matched[0]).toBe(plnPrice);
    expect(matched[1]).toMatchObject({
      createdAt: eurPrice.createdAt,
      country: eurPrice.country,
    });
  });

  it("warns about a currency without a PLN rate at most once an hour", async () => {
    vi.useFakeTimers();
    const { listing } = setup();
    const logger = fakeSystemLogService();
    const withLogger = new CountryOutlierManager(
      { report: vi.fn() },
      { getPlnRates: vi.fn().mockResolvedValue([]) } as unknown as CurrencyExchangeRateService,
      { getMatchingRules: vi.fn().mockReturnValue([]) } as unknown as CountryOutlierStrategy,
      logger.service
    );
    const sek = [[buildListingPrice({ country: { currencyId: 4, currencyCode: "SEK", code: "se" } })]];

    await withLogger.check(listing, [...fourCountries(), ...sek]);
    vi.advanceTimersByTime(60 * 60 * 1000 - 1);
    await withLogger.check(listing, [...fourCountries(), ...sek]);
    vi.advanceTimersByTime(1);
    await withLogger.check(listing, fourCountries());
    vi.useRealTimers();

    expect(logger.warn.mock.calls).toEqual([
      [
        "CountryOutlierManager",
        "No PLN exchange rate for PLN, compared without conversion",
        { currencyId: 1, currencyCode: "PLN", country: "pl" },
      ],
      [
        "CountryOutlierManager",
        "No PLN exchange rate for SEK, compared without conversion",
        { currencyId: 4, currencyCode: "SEK", country: "se" },
      ],
      [
        "CountryOutlierManager",
        "No PLN exchange rate for PLN, compared without conversion",
        { currencyId: 1, currencyCode: "PLN", country: "pl" },
      ],
    ]);
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
      [buildListingPrice({ value: 200 })],
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

    await manager.check(listing, fourCountries());

    const [matched] = getMatchingRules.mock.calls[0];
    expect(reporter.report.mock.calls).toEqual([
      [listing, matched, "2"],
      [listing, matched, "5"],
    ]);
  });

  it("reports nothing when no rule matches", async () => {
    const { manager, reporter, listing } = setup([]);

    await manager.check(listing, fourCountries());

    expect(reporter.report).not.toHaveBeenCalled();
  });

  const history = (...values: number[]) =>
    values.map((value) => buildListingPrice({ value }));

  it.each([
    ["the cheapest price did not change", [100, 100]],
    ["the cheapest price dropped by less than 5%", [95.01, 100]],
    ["the cheapest price rose", [105, 100]],
  ])("skips the listing when %s", async (_, cheapest) => {
    const { manager, reporter, getMatchingRules, listing } = setup();

    await manager.check(listing, [
      history(300, 200),
      history(...cheapest),
      history(400),
      history(500),
    ]);

    expect(getMatchingRules).not.toHaveBeenCalled();
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it.each([
    ["dropped by 5%", [95, 100]],
    ["has no previous price", [100]],
  ])("checks the listing when the cheapest price %s", async (_, cheapest) => {
    const { manager, reporter, listing } = setup(["1"]);

    await manager.check(listing, [
      history(300, 300),
      history(...cheapest),
      history(400, 400),
      history(500, 500),
    ]);

    expect(reporter.report).toHaveBeenCalledTimes(1);
  });

  it("picks the cheapest country after converting to PLN", async () => {
    const { manager, reporter, getPlnRates, listing } = setup(["1"]);
    const eur = buildCurrency({ code: "EUR" });
    getPlnRates.mockResolvedValue([buildRate({ source: eur, value: 4.5 })]);
    const eurHistory = [10, 8].map((value) =>
      buildListingPrice({
        value,
        country: { currencyId: eur.id, currencyCode: "EUR" },
      })
    );

    await manager.check(listing, [
      history(30, 30),
      eurHistory,
      history(100, 100),
      history(200, 200),
    ]);

    expect(reporter.report).not.toHaveBeenCalled();
  });
});
