import { describe, expect, it } from "vitest";
import { PricingErrorManager } from "@/modules/anomalies/pricing-error/PricingErrorManager";
import { buildListing, buildListingPrice } from "../../../../support/factories";
import {
  fakeDiscordPricingErrorService,
  fakeLogService,
} from "../../../../support/fakes";

const setup = () => {
  const discord = fakeDiscordPricingErrorService();
  const log = fakeLogService();
  const manager = new PricingErrorManager(discord.service, log.service);
  return { manager, discord, log, listing: buildListing() };
};

// newest price first, as the marketplace passes them in
const history = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("PricingErrorManager", () => {
  it("sends when the newest price is at most 50% of the previous and below all older ones", async () => {
    const { manager, discord, log, listing } = setup();
    const country = history(50, 100, 80);

    await manager.check(listing, [country]);

    expect(log.create).toHaveBeenCalledWith({ event: "pricing_error_sent" });
    expect(discord.send).toHaveBeenCalledWith(listing, [country]);
  });

  it("does not send when the drop is smaller than 50%", async () => {
    const { manager, discord, log, listing } = setup();

    await manager.check(listing, [history(51, 100)]);

    expect(discord.send).not.toHaveBeenCalled();
    expect(log.create).not.toHaveBeenCalled();
  });

  it("does not send when an older price was lower than or equal to the newest", async () => {
    const { manager, discord, listing } = setup();

    await manager.check(listing, [history(40, 100, 30), history(40, 100, 40)]);

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("does not send with a single price", async () => {
    const { manager, discord, listing } = setup();

    await manager.check(listing, [history(40)]);

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("requires a reportable newest price and an active country", async () => {
    const { manager, discord, listing } = setup();
    const notReportable = [
      buildListingPrice({ value: 40, reportable: false }),
      buildListingPrice({ value: 100 }),
    ];
    const inactive = [
      buildListingPrice({ value: 40, country: { active: false } }),
      buildListingPrice({ value: 100, country: { active: false } }),
    ];

    await manager.check(listing, [notReportable, inactive]);

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("sends only the qualifying countries", async () => {
    const { manager, discord, listing } = setup();
    const qualifying = history(40, 100);
    const notQualifying = history(90, 100);

    await manager.check(listing, [notQualifying, qualifying]);

    expect(discord.send).toHaveBeenCalledWith(listing, [qualifying]);
  });
});
