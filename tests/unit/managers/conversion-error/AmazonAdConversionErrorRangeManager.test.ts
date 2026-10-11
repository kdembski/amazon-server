import { describe, expect, it } from "vitest";
import { AmazonAdConversionErrorRangeManager } from "@/managers/conversion-error/AmazonAdConversionErrorRangeManager";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { buildAd, buildPrice } from "../../../support/factories";
import {
  fakeDiscordConversionErrorService,
  fakeLogService,
} from "../../../support/fakes";

const setup = (evaluator = new AmazonAdConversionErrorEvaluator()) => {
  const log = fakeLogService();
  const discord = fakeDiscordConversionErrorService();
  const manager = new AmazonAdConversionErrorRangeManager(
    evaluator,
    log.service,
    discord.service
  );
  return { manager, log, discord, ad: buildAd() };
};

const prices = (...values: number[]) =>
  values.map((value) => buildPrice({ value }));

describe("AmazonAdConversionErrorRangeManager", () => {
  it.each([
    { values: [20, 100, 100], channel: "4", event: "conversion_error_4_sent" },
    { values: [50, 500, 500], channel: "4", event: "conversion_error_4_sent" },
    { values: [60, 300, 300], channel: "5", event: "conversion_error_5_sent" },
    { values: [200, 1000, 1000], channel: "5", event: "conversion_error_5_sent" },
    { values: [250, 1000, 1000], channel: "6", event: "conversion_error_6_sent" },
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

  it("requires at least 70% difference", async () => {
    const { manager, discord, ad } = setup();

    await manager.check(ad, prices(40, 100, 100));

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("requires Amazon dispatch", async () => {
    const { manager, discord, ad } = setup();

    await manager.check(ad, [
      buildPrice({ value: 10, dispatchFrom: "Seller" }),
      ...prices(100, 100),
    ]);

    expect(discord.send).not.toHaveBeenCalled();
  });

  it("does nothing when no range matches", async () => {
    // The three ranges (0-50, 50-200, 200+) cover every positive Decimal, so
    // this branch is unreachable with a real evaluator; stub isInRange instead.
    const evaluator = new AmazonAdConversionErrorEvaluator();
    evaluator.isInRange = () => false;
    const { manager, discord, log, ad } = setup(evaluator);

    await manager.check(ad, prices(10, 100, 100));

    expect(discord.send).not.toHaveBeenCalled();
    expect(log.create).not.toHaveBeenCalled();
  });
});
