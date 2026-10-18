import { afterEach, describe, expect, it, vi } from "vitest";
import { AmazonAdAnomalyManager } from "@/managers/AmazonAdAnomalyManager";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdPricingErrorManager } from "@/managers/pricing-error/AmazonAdPricingErrorManager";
import { buildAd, buildPrice } from "../../support/factories";

const setup = () => {
  const conversion = { check: vi.fn().mockResolvedValue(undefined) };
  const pricing = { check: vi.fn().mockResolvedValue(undefined) };
  const manager = new AmazonAdAnomalyManager(
    conversion as unknown as AmazonAdConversionErrorManager,
    pricing as unknown as AmazonAdPricingErrorManager
  );
  return { manager, conversion, pricing, ad: buildAd() };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AmazonAdAnomalyManager", () => {
  it("passes the ad and country prices to every manager", async () => {
    const { manager, conversion, pricing, ad } = setup();
    const countryPrices = [[buildPrice(), buildPrice()], [buildPrice()]];

    await manager.check(ad, countryPrices);

    expect(conversion.check).toHaveBeenCalledWith(ad, countryPrices);
    expect(pricing.check).toHaveBeenCalledWith(ad, countryPrices);
  });

  it("logs a failing manager and still runs the others", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { manager, conversion, pricing, ad } = setup();
    conversion.check.mockRejectedValue(new Error("db down"));

    await manager.check(ad, [[buildPrice()]]);

    expect(pricing.check).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("AmazonAdAnomalyManager: Error: db down");
  });
});
