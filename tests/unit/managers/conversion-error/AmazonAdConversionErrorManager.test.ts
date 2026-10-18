import { describe, expect, it, vi } from "vitest";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdConversionErrorStrategy } from "@/managers/conversion-error/AmazonAdConversionErrorStrategy";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { StorageService } from "@/services/StorageService";
import {
  buildAd,
  buildCurrency,
  buildPrice,
  buildPriceCountry,
  buildRate,
} from "../../../support/factories";
import {
  fakeDiscordConversionErrorService,
  fakeLogService,
} from "../../../support/fakes";

const setup = (channels = ["1", "4"]) => {
  const log = fakeLogService();
  const discord = fakeDiscordConversionErrorService();
  const getByTargetCode = vi.fn().mockResolvedValue([]);
  const getMatchingRules = vi
    .fn()
    .mockReturnValue(channels.map((channel) => ({ channel })));
  const storage = { state: {} } as StorageService;
  const manager = new AmazonAdConversionErrorManager(
    discord.service,
    log.service,
    { getByTargetCode } as unknown as CurrencyExchangeRateService,
    storage,
    { getMatchingRules } as unknown as AmazonAdConversionErrorStrategy
  );
  return {
    manager,
    log,
    discord,
    getByTargetCode,
    getMatchingRules,
    storage,
    ad: buildAd(),
  };
};

const threeCountries = () => [[buildPrice()], [buildPrice()], [buildPrice()]];

describe("AmazonAdConversionErrorManager", () => {
  it("ignores ads with fewer than 3 countries", async () => {
    const { manager, getByTargetCode, getMatchingRules, ad } = setup();

    await manager.check(ad, [[buildPrice(), buildPrice()], [buildPrice()]]);

    expect(getByTargetCode).not.toHaveBeenCalled();
    expect(getMatchingRules).not.toHaveBeenCalled();
  });

  it("matches rules on the newest prices converted to PLN and sorted ascending", async () => {
    const { manager, getByTargetCode, getMatchingRules, ad } = setup();
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

    await manager.check(ad, [
      [otherPln, buildPrice({ value: 1 })],
      [eurPrice],
      [plnPrice],
    ]);

    expect(getByTargetCode).toHaveBeenCalledWith("PLN");
    const [matched] = getMatchingRules.mock.calls[0] as [AmazonAdPriceSelectDto[]];
    expect(matched.map((p) => p.value.toNumber())).toEqual([30, 45, 100]);
    expect(matched[0]).toBe(plnPrice);
    expect(matched[1]).toMatchObject({ id: eurPrice.id, country: eurPrice.country });
  });

  it("does not modify the given prices", async () => {
    const { manager, getByTargetCode, ad } = setup();
    const eur = buildCurrency({ code: "EUR" });
    getByTargetCode.mockResolvedValue([buildRate({ source: eur, value: 4.5 })]);
    const eurPrice = buildPrice({
      value: 10,
      country: buildPriceCountry({ currencyId: eur.id, currency: eur }),
    });
    const countryPrices = [
      [buildPrice({ value: 100 })],
      [eurPrice],
      [buildPrice({ value: 30 })],
    ];
    const order = countryPrices.map(([price]) => price);

    await manager.check(ad, countryPrices);

    expect(eurPrice.value.toNumber()).toBe(10);
    expect(countryPrices.map(([price]) => price)).toEqual(order);
  });

  it("caches rates in storage and does not refetch", async () => {
    const { manager, getByTargetCode, storage, ad } = setup();
    const rates = [buildRate()];
    getByTargetCode.mockResolvedValue(rates);

    await manager.check(ad, threeCountries());
    await manager.check(ad, threeCountries());

    expect(storage.state.plnExchangeRates).toBe(rates);
    expect(getByTargetCode).toHaveBeenCalledTimes(1);
  });

  it("uses rates already present in storage", async () => {
    const { manager, getByTargetCode, storage, ad } = setup();
    storage.state.plnExchangeRates = [];

    await manager.check(ad, threeCountries());

    expect(getByTargetCode).not.toHaveBeenCalled();
  });

  it("reports every rule matched by the strategy", async () => {
    const { manager, log, discord, getMatchingRules, ad } = setup(["2", "5"]);

    await manager.check(ad, threeCountries());

    const [matched] = getMatchingRules.mock.calls[0];
    expect(log.create.mock.calls).toEqual([
      [{ event: "conversion_error_2_sent" }],
      [{ event: "conversion_error_5_sent" }],
    ]);
    expect(discord.setChannel.mock.calls).toEqual([["2"], ["5"]]);
    expect(discord.send).toHaveBeenCalledTimes(2);
    expect(discord.send).toHaveBeenCalledWith(ad, matched);
  });

  it("reports nothing when no rule matches", async () => {
    const { manager, log, discord, ad } = setup([]);

    await manager.check(ad, threeCountries());

    expect(log.create).not.toHaveBeenCalled();
    expect(discord.send).not.toHaveBeenCalled();
  });
});
