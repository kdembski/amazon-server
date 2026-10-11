import { describe, expect, it } from "vitest";
import { AmazonAdConversionErrorPercentageManager } from "@/managers/conversion-error/AmazonAdConversionErrorPercentageManager";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { buildAd, buildPrice } from "../../../support/factories";
import {
  fakeDiscordConversionErrorService,
  fakeLogService,
} from "../../../support/fakes";

const setup = () => {
  const log = fakeLogService();
  const discord = fakeDiscordConversionErrorService();
  const manager = new AmazonAdConversionErrorPercentageManager(
    new AmazonAdConversionErrorEvaluator(),
    log.service,
    discord.service
  );
  return { manager, log, discord, ad: buildAd() };
};

const prices = (...values: number[]) =>
  values.map((value) => buildPrice({ value }));

describe("AmazonAdConversionErrorPercentageManager", () => {
  it.each([
    { values: [9, 100, 120], channel: "3", event: "conversion_error_3_sent" },
    { values: [25, 100, 120], channel: "2", event: "conversion_error_2_sent" },
    { values: [45, 100, 120], channel: "1", event: "conversion_error_1_sent" },
  ])(
    "sends to channel $channel for prices $values",
    async ({ values, channel, event }) => {
      const { manager, log, discord, ad } = setup();
      const list = prices(...values);

      await manager.check(ad, list);

      expect(log.create).toHaveBeenCalledWith({ event });
      expect(discord.setChannel).toHaveBeenCalledWith(channel);
      expect(discord.send).toHaveBeenCalledWith(ad, list);
      expect(discord.send).toHaveBeenCalledTimes(1);
    }
  );

  it("does nothing below 50% difference", async () => {
    const { manager, log, discord, ad } = setup();

    await manager.check(ad, prices(60, 100, 120));

    expect(log.create).not.toHaveBeenCalled();
    expect(discord.send).not.toHaveBeenCalled();
  });

  it("does nothing when the cheapest offer is not dispatched by Amazon", async () => {
    const { manager, discord, ad } = setup();
    const list = [
      buildPrice({ value: 10, dispatchFrom: "Seller" }),
      ...prices(100, 120),
    ];

    await manager.check(ad, list);

    expect(discord.send).not.toHaveBeenCalled();
  });
});
