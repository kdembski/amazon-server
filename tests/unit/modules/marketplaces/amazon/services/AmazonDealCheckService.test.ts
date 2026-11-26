import { describe, expect, it, vi } from "vitest";
import { AmazonDealCheckService } from "@/modules/marketplaces/amazon/services/AmazonDealCheckService";
import {
  AMAZON_DEAL_CHECK_PROMPT,
  AMAZON_DEAL_CHECK_SCHEMA,
} from "@/modules/marketplaces/amazon/services/AmazonDealCheckPrompt";
import { ClaudeCliService } from "@/shared/claude/ClaudeCliService";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";
import { buildAd } from "../../../../../support/factories";
import {
  fakeBusinessLogService,
  fakeDiscordChannelService,
  fakeSystemLogService,
  resetSingleton,
} from "../../../../../support/fakes";

const setup = (answer: unknown) => {
  const run = answer instanceof Error ? vi.fn().mockRejectedValue(answer) : vi.fn().mockResolvedValue(answer);
  const log = fakeBusinessLogService();
  const discord = fakeDiscordChannelService();
  const logger = fakeSystemLogService();
  const tasks: Promise<unknown>[] = [];
  const queue = { add: vi.fn((task: (waitedMs: number) => Promise<unknown>) => tasks.push(task(0))) };
  const service = new AmazonDealCheckService(
    { run } as unknown as ClaudeCliService,
    discord.service,
    log.service,
    logger.service,
    queue as unknown as ConcurrencyQueue
  );
  return { service, run, log, discord, logger, flush: () => Promise.all(tasks) };
};

const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
const alert = { title: "Bosch drill" };
const prices = [
  { country: "Niemcy", value: "50", currency: "PLN", url: "https://amazon.de/dp/B000TEST01" },
  { country: "Polska", value: "200", currency: "PLN", url: "https://amazon.pl/dp/B000TEST01" },
];
const answer = (overrides: object = {}) => ({
  verdict: "KUPUJ",
  allegro: [
    "podobny: [Bosch](https://allegro.pl/oferta/1) **289 zł**",
    "podobny: [Makita](https://allegro.pl/oferta/2) **299 zł**",
  ],
  profit: "**163 zł** · ROI 183% · koszt 89,40 zł · *prowizja 11%*",
  ...overrides,
});

const sentAnalysis = (discord: ReturnType<typeof fakeDiscordChannelService>) => {
  return discord.send.mock.calls[0][1].embeds[1];
};

describe("AmazonDealCheckService", () => {
  it.each([
    ["KUPUJ", "✅ **KUPUJ**"],
    ["MOŻE", "❔ **MOŻE**"],
    ["NIE", "❌ **NIE**"],
  ])("sends the alert with the analysis fields for %s", async (verdict, description) => {
    const { service, log, discord, flush } = setup(answer({ verdict }));

    service.check(ad, prices, alert, 5);
    await flush();

    expect(log.create).toHaveBeenCalledWith({
      type: "deal_check_sent",
      marketplace: "amazon",
      data: { asin: "B000TEST01", name: "Bosch drill", channel: "5", verdict },
    });
    expect(discord.send).toHaveBeenCalledWith(
      5,
      {
        embeds: [
          alert,
          {
            description:
              `${description}\n\n` +
              "podobny: [Bosch](https://allegro.pl/oferta/1) **289 zł**\n" +
              "podobny: [Makita](https://allegro.pl/oferta/2) **299 zł**\n\n" +
              "**163 zł** · ROI 183% · koszt 89,40 zł · *prowizja 11%*",
          },
        ],
      },
      { asin: "B000TEST01" }
    );
  });

  it.each([
    ["an unknown verdict", answer({ verdict: "TAK" })],
    ["no object", "Nie mogę ocenić"],
  ])("logs an error and sends the alert alone for %s", async (_, invalid) => {
    const { service, discord, logger, flush } = setup(invalid);

    service.check(ad, prices, alert, 5);
    await flush();

    expect(discord.send).toHaveBeenCalledWith(5, { embeds: [alert] }, { asin: "B000TEST01" });
    expect(logger.error).toHaveBeenCalledWith("AmazonDealCheckService", "Deal check of B000TEST01 returned no verdict", {
      asin: "B000TEST01",
      answer: invalid,
    });
  });

  it("logs an error and sends the alert alone when claude fails", async () => {
    const error = new Error("timeout");
    const { service, discord, log, logger, flush } = setup(error);

    service.check(ad, prices, alert, 5);
    await flush();

    expect(discord.send).toHaveBeenCalledWith(5, { embeds: [alert] }, { asin: "B000TEST01" });
    expect(log.create).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("AmazonDealCheckService", "Deal check of B000TEST01 failed", {
      asin: "B000TEST01",
      error,
    });
  });

  it("truncates a part to 700 characters and fills an empty one", async () => {
    const { service, discord, flush } = setup(answer({ allegro: ["a".repeat(1000)], profit: "" }));

    service.check(ad, prices, alert, 5);
    await flush();

    expect(sentAnalysis(discord).description).toBe(`✅ **KUPUJ**\n\n${"a".repeat(700)}\n\nbrak danych`);
  });

  it("analyses an ad once and posts its alerts to every channel that asked meanwhile", async () => {
    const { service, run, log, discord, flush } = setup(answer());
    const other = { title: "Price drop" };

    service.check(ad, prices, alert, 5);
    service.check(ad, prices, other, 9);
    await flush();

    expect(run).toHaveBeenCalledTimes(1);
    expect(log.create).toHaveBeenCalledTimes(2);
    expect(discord.send).toHaveBeenNthCalledWith(1, 5, { embeds: [alert, expect.anything()] }, { asin: "B000TEST01" });
    expect(discord.send).toHaveBeenNthCalledWith(2, 9, { embeds: [other, expect.anything()] }, { asin: "B000TEST01" });
  });

  it("analyses the ad again once the previous analysis has finished", async () => {
    const { service, run, flush } = setup(answer());

    service.check(ad, prices, alert, 5);
    await flush();
    service.check(ad, prices, alert, 9);
    await flush();

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("logs an error and still posts to the other channels when posting fails", async () => {
    const error = new Error("discord down");
    const { service, discord, logger, flush } = setup(answer());
    discord.send.mockRejectedValueOnce(error);

    service.check(ad, prices, alert, 5);
    service.check(ad, prices, alert, 9);
    await flush();

    expect(logger.error).toHaveBeenCalledWith(
      "AmazonDealCheckService",
      "Posting the deal check of B000TEST01 failed",
      { asin: "B000TEST01", channelId: 5, error }
    );
    expect(discord.send).toHaveBeenCalledTimes(2);
  });

  it("shares one instance", () => {
    resetSingleton(AmazonDealCheckService);

    expect(AmazonDealCheckService.getInstance()).toBe(AmazonDealCheckService.getInstance());
  });

  it("asks about the ad with its prices, the deal check instructions and the answer schema", async () => {
    const { service, run, flush } = setup(answer());

    service.check(ad, prices, alert, 5);
    await flush();

    const [prompt, systemPrompt, schema] = run.mock.calls[0];
    expect(prompt).toContain("Bosch drill");
    expect(prompt).toContain("ASIN: B000TEST01");
    expect(prompt).toContain(
      "Niemcy: 50 PLN (https://amazon.de/dp/B000TEST01)\nPolska: 200 PLN (https://amazon.pl/dp/B000TEST01)"
    );
    expect(systemPrompt).toBe(AMAZON_DEAL_CHECK_PROMPT);
    expect(schema).toBe(AMAZON_DEAL_CHECK_SCHEMA);
  });
});
