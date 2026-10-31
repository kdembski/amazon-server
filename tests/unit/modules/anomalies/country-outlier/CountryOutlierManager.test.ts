import { describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
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

const fakeReporter = (reported?: number) => ({
  report: vi.fn().mockResolvedValue(undefined),
  getReportedPrice: vi
    .fn()
    .mockResolvedValue(reported === undefined ? undefined : new Decimal(reported)),
  setReportedPrice: vi.fn().mockResolvedValue(undefined),
});

const setup = (channels = ["1", "4"], reported?: number) => {
  const reporter = fakeReporter(reported);
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
  it("ignores listings with fewer than 3 countries", async () => {
    const { manager, getPlnRates, getMatchingRules, listing } = setup();

    await manager.check(listing, [
      [buildListingPrice(), buildListingPrice()],
      [buildListingPrice()],
    ]);

    expect(getPlnRates).not.toHaveBeenCalled();
    expect(getMatchingRules).not.toHaveBeenCalled();
  });

  it("ignores countries missing from the scrape", async () => {
    const { manager, getMatchingRules, listing } = setup();

    await manager.check(listing, [
      ...fourCountries().slice(2),
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
      fakeReporter(),
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
      [listing, matched, "2", undefined],
      [listing, matched, "5", undefined],
    ]);
  });

  it("reports nothing when no rule matches", async () => {
    const { manager, reporter, listing } = setup([]);

    await manager.check(listing, fourCountries());

    expect(reporter.report).not.toHaveBeenCalled();
  });

  const history = (...values: number[]) =>
    values.map((value) => buildListingPrice({ value }));

  it("reports a listing never reported before even when its cheapest price did not change", async () => {
    const { manager, reporter, listing } = setup(["1"]);
    const cheapest = history(100, 100);

    await manager.check(listing, [history(300), cheapest, history(400), history(500)]);

    expect(reporter.getReportedPrice).toHaveBeenCalledWith(listing, cheapest[0]);
    expect(reporter.report).toHaveBeenCalledTimes(1);
    expect(reporter.setReportedPrice).toHaveBeenCalledWith(listing, cheapest[0]);
  });

  it.each([
    ["did not change", [100, 100], 100],
    ["is less than 5% below the reported price", [95.01, 100], 100],
    ["rose", [105, 100], 100],
    ["dropped by 5% since the previous price back to the reported price", [100, 105.27], 100],
    ["dropped by 5% since the previous price above the reported price", [95, 100], 90],
  ])("skips a reported listing whose cheapest price %s", async (_, cheapest, reported) => {
    const { manager, reporter, listing } = setup(["1"], reported);

    await manager.check(listing, [history(300, 200), history(...cheapest), history(400), history(500)]);

    expect(reporter.report).not.toHaveBeenCalled();
    expect(reporter.setReportedPrice).not.toHaveBeenCalled();
  });

  it.each([
    ["is 5% below the reported price without a drop since the previous one", [95, 96], 100],
    ["is 5% below the reported price after a rise", [95, 150], 100],
  ])("reports a reported listing again when its cheapest price %s", async (_, cheapest, reported) => {
    const { manager, reporter, listing } = setup(["1"], reported);

    await manager.check(listing, [history(300, 300), history(...cheapest), history(400, 400), history(500, 500)]);

    expect(reporter.report).toHaveBeenCalledTimes(1);
    expect(reporter.setReportedPrice).toHaveBeenCalledTimes(1);
  });

  it("does not read the reported price when no rule matches", async () => {
    const { manager, reporter, listing } = setup([]);

    await manager.check(listing, fourCountries());

    expect(reporter.getReportedPrice).not.toHaveBeenCalled();
  });

  it("keeps the reported price when the report fails", async () => {
    const { manager, reporter, listing } = setup(["1"]);
    reporter.report.mockRejectedValue(new Error("db down"));

    await expect(manager.check(listing, fourCountries())).rejects.toThrow("db down");
    expect(reporter.setReportedPrice).not.toHaveBeenCalled();
  });

  it("passes the drop of the cheapest price since the last report in percent", async () => {
    const { manager, reporter, listing } = setup(["1"], 100);

    await manager.check(listing, [
      history(300, 300),
      history(60, 60),
      history(400, 400),
      history(500, 500),
    ]);

    expect(reporter.report.mock.calls[0][3]).toBe(-40);
  });

  it("passes no drop for a listing never reported before", async () => {
    const { manager, reporter, listing } = setup(["1"]);

    await manager.check(listing, [history(300), history(60, 100), history(400), history(500)]);

    expect(reporter.report.mock.calls[0][3]).toBeUndefined();
  });

  it("picks the cheapest country after converting to PLN", async () => {
    const { manager, reporter, getPlnRates, listing } = setup(["1"], 30);
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
