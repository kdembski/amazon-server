import { describe, expect, it, vi } from "vitest";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdConversionErrorStrategy } from "@/managers/conversion-error/AmazonAdConversionErrorStrategy";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
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
  const getPlnRates = vi.fn().mockResolvedValue([]);
  const getMatchingRules = vi
    .fn()
    .mockReturnValue(channels.map((channel) => ({ channel })));
  const manager = new AmazonAdConversionErrorManager(
    discord.service,
    log.service,
    { getPlnRates } as unknown as CurrencyExchangeRateService,
    { getMatchingRules } as unknown as AmazonAdConversionErrorStrategy
  );
  return {
    manager,
    log,
    discord,
    getPlnRates,
    getMatchingRules,
    ad: buildAd(),
  };
};

const threeCountries = () => [[buildPrice()], [buildPrice()], [buildPrice()]];

describe("AmazonAdConversionErrorManager", () => {
  it("ignores ads with fewer than 3 countries", async () => {
    const { manager, getPlnRates, getMatchingRules, ad } = setup();

    await manager.check(ad, [[buildPrice(), buildPrice()], [buildPrice()]]);

    expect(getPlnRates).not.toHaveBeenCalled();
    expect(getMatchingRules).not.toHaveBeenCalled();
  });

  it("matches rules on the newest prices converted to PLN and sorted ascending", async () => {
    const { manager, getPlnRates, getMatchingRules, ad } = setup();
    const eur = buildCurrency({ code: "EUR" });
    const pln = buildCurrency({ code: "PLN" });
    getPlnRates.mockResolvedValue([
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

    expect(getPlnRates).toHaveBeenCalled();
    const [matched] = getMatchingRules.mock.calls[0] as [AmazonAdPriceSelectDto[]];
    expect(matched.map((p) => p.value.toNumber())).toEqual([30, 45, 100]);
    expect(matched[0]).toBe(plnPrice);
    expect(matched[1]).toMatchObject({ id: eurPrice.id, country: eurPrice.country });
  });

  it("does not modify the given prices", async () => {
    const { manager, getPlnRates, ad } = setup();
    const eur = buildCurrency({ code: "EUR" });
    getPlnRates.mockResolvedValue([buildRate({ source: eur, value: 4.5 })]);
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
