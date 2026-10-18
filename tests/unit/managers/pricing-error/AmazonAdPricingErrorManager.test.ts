import { describe, expect, it } from "vitest";
import { AmazonAdPricingErrorManager } from "@/managers/pricing-error/AmazonAdPricingErrorManager";
import { buildAd, buildPrice, buildPriceCountry } from "../../../support/factories";
import {
  fakeDiscordPricingErrorService,
  fakeLogService,
} from "../../../support/fakes";

const setup = () => {
  const discord = fakeDiscordPricingErrorService();
  const log = fakeLogService();
  const manager = new AmazonAdPricingErrorManager(discord.service, log.service);
  return { manager, discord, log, ad: buildAd() };
};

// newest price first, as returned by AmazonAdPriceRepository.getByAdAndCountry
const history = (...values: number[]) => {
  const country = buildPriceCountry();
  return values.map((value) => buildPrice({ value, country }));
};

describe("AmazonAdPricingErrorManager", () => {
  it("sends when the newest price is at most 50% of the previous and below all older ones", async () => {
    const { manager, discord, log, ad } = setup();
    const country = history(50, 100, 80);

    await manager.check(ad, [country]);

    expect(log.create).toHaveBeenCalledWith({ event: "pricing_error_sent" });
    expect(discord.send).toHaveBeenCalledWith(ad, [country]);
  });

  it("does not send when the drop is smaller than 50%", async () => {
    const { manager, discord, log, ad } = setup();

    await manager.check(ad, [history(51, 100)]);

    expect(discord.send).not.toHaveBeenCalled();
    expect(log.create).not.toHaveBeenCalled();
  });

  it("does not send when an older price was lower than or equal to the newest", async () => {
    const { manager, discord, ad } = setup();

    await manager.check(ad, [history(40, 100, 30), history(40, 100, 40)]);

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("does not send with a single price", async () => {
    const { manager, discord, ad } = setup();

    await manager.check(ad, [history(40)]);

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("requires Amazon dispatch and an active country", async () => {
    const { manager, discord, ad } = setup();
    const seller = history(40, 100);
    seller[0].dispatchFrom = "Seller";
    const unknownDispatch = history(40, 100);
    unknownDispatch[0].dispatchFrom = null;
    const inactive = history(40, 100).map((p) => ({
      ...p,
      country: { ...p.country, active: false },
    }));

    await manager.check(ad, [seller, unknownDispatch, inactive]);

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("sends only the qualifying countries", async () => {
    const { manager, discord, ad } = setup();
    const qualifying = history(40, 100);
    const notQualifying = history(90, 100);

    await manager.check(ad, [notQualifying, qualifying]);

    expect(discord.send).toHaveBeenCalledWith(ad, [qualifying]);
  });
});
