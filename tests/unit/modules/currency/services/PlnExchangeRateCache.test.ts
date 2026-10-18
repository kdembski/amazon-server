import { afterEach, describe, expect, it } from "vitest";
import { PlnExchangeRateCache } from "@/modules/currency/services/PlnExchangeRateCache";
import { buildRate } from "../../../../support/factories";
import { resetSingleton } from "../../../../support/fakes";

describe("PlnExchangeRateCache", () => {
  afterEach(() => resetSingleton(PlnExchangeRateCache));

  it("returns the same instance and starts empty", () => {
    const cache = PlnExchangeRateCache.getInstance();

    expect(PlnExchangeRateCache.getInstance()).toBe(cache);
    expect(cache.rates).toBeUndefined();
  });

  it("keeps assigned rates", () => {
    const rates = [buildRate()];
    PlnExchangeRateCache.getInstance().rates = rates;

    expect(PlnExchangeRateCache.getInstance().rates).toBe(rates);
  });
});
