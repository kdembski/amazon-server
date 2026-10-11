import { describe, expect, it, vi } from "vitest";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdConversionErrorPercentageManager } from "@/managers/conversion-error/AmazonAdConversionErrorPercentageManager";
import { AmazonAdConversionErrorRangeManager } from "@/managers/conversion-error/AmazonAdConversionErrorRangeManager";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { StorageService } from "@/services/StorageService";
import {
  buildAd,
  buildCurrency,
  buildPrice,
  buildPriceCountry,
  buildRate,
} from "../../../support/factories";

const setup = () => {
  const percentage = { check: vi.fn() };
  const range = { check: vi.fn() };
  const getByTargetCode = vi.fn().mockResolvedValue([]);
  const storage = { state: {} } as StorageService;
  const manager = new AmazonAdConversionErrorManager(
    percentage as unknown as AmazonAdConversionErrorPercentageManager,
    range as unknown as AmazonAdConversionErrorRangeManager,
    { getByTargetCode } as unknown as CurrencyExchangeRateService,
    storage
  );
  return { manager, percentage, range, getByTargetCode, storage, ad: buildAd() };
};

const threePrices = () => [buildPrice(), buildPrice(), buildPrice()];

describe("AmazonAdConversionErrorManager", () => {
  it("ignores ads with fewer than 3 country prices", async () => {
    const { manager, percentage, range, getByTargetCode, ad } = setup();

    await manager.check(ad, [buildPrice(), buildPrice()]);

    expect(getByTargetCode).not.toHaveBeenCalled();
    expect(percentage.check).not.toHaveBeenCalled();
    expect(range.check).not.toHaveBeenCalled();
  });

  it("converts prices to PLN, sorts ascending and passes them to both managers", async () => {
    const { manager, percentage, range, getByTargetCode, ad } = setup();
    const eur = buildCurrency({ code: "EUR" });
    const pln = buildCurrency({ code: "PLN" });
    getByTargetCode.mockResolvedValue([
      buildRate({ source: eur, target: pln, value: 4.5 }),
    ]);

    const eurPrice = buildPrice({
      value: 10,
      country: buildPriceCountry({ currencyId: eur.id, currency: eur }),
    });
    const plnPrice = buildPrice({
      value: 30,
      country: buildPriceCountry({ currencyId: pln.id, currency: pln }),
    });
    const otherPln = buildPrice({
      value: 100,
      country: buildPriceCountry({ currencyId: pln.id, currency: pln }),
    });
    const list = [otherPln, eurPrice, plnPrice];

    await manager.check(ad, list);

    expect(getByTargetCode).toHaveBeenCalledWith("PLN");
    expect(list.map((p) => p.value.toNumber())).toEqual([30, 45, 100]);
    expect(list[0]).toBe(plnPrice);
    expect(list[1]).toBe(eurPrice);
    expect(percentage.check).toHaveBeenCalledWith(ad, list);
    expect(range.check).toHaveBeenCalledWith(ad, list);
  });

  it("caches rates in storage and does not refetch", async () => {
    const { manager, getByTargetCode, storage, ad } = setup();
    const rates = [buildRate()];
    getByTargetCode.mockResolvedValue(rates);

    await manager.check(ad, threePrices());
    await manager.check(ad, threePrices());

    expect(storage.state.plnExchangeRates).toBe(rates);
    expect(getByTargetCode).toHaveBeenCalledTimes(1);
  });

  it("uses rates already present in storage", async () => {
    const { manager, getByTargetCode, storage, ad } = setup();
    storage.state.plnExchangeRates = [];

    await manager.check(ad, threePrices());

    expect(getByTargetCode).not.toHaveBeenCalled();
  });

  it("skips managers when the cheapest country is inactive", async () => {
    const { manager, percentage, range, ad } = setup();
    const inactive = buildPrice({
      value: 1,
      country: buildPriceCountry({ active: false }),
    });

    await manager.check(ad, [
      buildPrice({ value: 50 }),
      inactive,
      buildPrice({ value: 70 }),
    ]);

    expect(percentage.check).not.toHaveBeenCalled();
    expect(range.check).not.toHaveBeenCalled();
  });
});
