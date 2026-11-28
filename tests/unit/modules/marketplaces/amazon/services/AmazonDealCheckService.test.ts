import { describe, expect, it, vi } from "vitest";
import { AmazonDealCheckService } from "@/modules/marketplaces/amazon/services/AmazonDealCheckService";
import {
  AMAZON_DEAL_CHECK_PROMPT,
  AMAZON_DEAL_CHECK_SCHEMA,
} from "@/modules/marketplaces/amazon/helpers/deal-check-prompt";
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
  query: "bosch gsr 12v-15",
  attributes: "Bosch GSR 12V-15 wkrętarka 12V",
  price: [289, 299.9],
  estimate: [280],
  profit: 167.81,
  sale: 289,
  cost: 89.4,
  roi: 187.7,
  commission: 11,
  ...overrides,
});

const sentAnalysis = (discord: ReturnType<typeof fakeDiscordChannelService>) => {
  return discord.send.mock.calls[0][1].embeds[1];
};

describe("AmazonDealCheckService", () => {
  it.each([
    ["KUPUJ", "### ✅ \u200AKUPUJ"],
    ["MOŻE", "### ❔ MOŻE"],
    ["NIE", "### ❌ \u200ANIE"],
  ])("sends the alert with the analysis for %s", async (verdict, heading) => {
    const { service, log, discord, flush } = setup(answer({ verdict }));

    service.check(ad, prices, alert, 5);
    await flush();

    expect(log.create).toHaveBeenCalledWith({
      type: "deal_check_done",
      marketplace: "amazon",
      data: { asin: "B000TEST01", name: "Bosch drill", verdict },
    });
    expect(discord.send).toHaveBeenCalledWith(
      5,
      {
        embeds: [
          alert,
          {
            description:
              `${heading}\nBosch GSR 12V-15 wkrętarka 12V\n` +
              "-# [Allegro](https://allegro.pl/listing?string=bosch+gsr+12v-15&order=p) · " +
              "[Google](https://www.google.com/search?q=bosch+gsr+12v-15)",
            fields: [
              { name: "Wycena", value: "**289.00 zł**\n-# 289.00 – 299.90 zł, 280.00 zł\\*", inline: true },
              { name: "Zysk", value: "**+167.81 zł**\n-# ROI: 188%, prowizja: 11%", inline: true },
            ],
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

  it("truncates the lines after the verdict to 700 characters", async () => {
    const { service, discord, flush } = setup(answer({ attributes: "b".repeat(800) }));

    service.check(ad, prices, alert, 5);
    await flush();

    expect(sentAnalysis(discord).description).toBe(`### ✅ \u200AKUPUJ\n${"b".repeat(700)}`);
  });

  it("shows only the verdict and the links without attributes and numbers", async () => {
    const empty = { price: [], estimate: [], profit: null, sale: null, roi: null, commission: null };
    const { service, discord, flush } = setup(answer({ ...empty, attributes: " " }));

    service.check(ad, prices, alert, 5);
    await flush();

    const { description, fields } = sentAnalysis(discord);
    expect(description).toMatch(/^### ✅ \u200AKUPUJ\n-# \[Allegro\]/);
    expect(fields).toEqual([]);
  });

  it("analyses an ad once and posts its alerts to every channel that asked meanwhile", async () => {
    const { service, run, log, discord, flush } = setup(answer());
    const other = { title: "Price drop" };

    service.check(ad, prices, alert, 5);
    service.check(ad, prices, other, 9);
    await flush();

    expect(run).toHaveBeenCalledTimes(1);
    expect(log.create).toHaveBeenCalledTimes(1);
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

  it("logs an error and still posts when logging the analysis fails", async () => {
    const error = new Error("db down");
    const { service, log, discord, logger, flush } = setup(answer());
    log.create.mockRejectedValueOnce(error);

    service.check(ad, prices, alert, 5);
    await flush();

    expect(logger.error).toHaveBeenCalledWith("AmazonDealCheckService", "Logging the deal check of B000TEST01 failed", {
      asin: "B000TEST01",
      error,
    });
    expect(discord.send).toHaveBeenCalledTimes(1);
  });

  it("shares one instance", () => {
    resetSingleton(AmazonDealCheckService);

    expect(AmazonDealCheckService.getInstance()).toBe(AmazonDealCheckService.getInstance());
  });

  it("asks about the ad with its prices, the deal check instructions and the answer schema", async () => {
    const { service, run, flush } = setup(answer());

    service.check(ad, prices, alert, 5);
    await flush();

    const [prompt, systemPrompt, schema, imageUrl] = run.mock.calls[0];
    expect(prompt).toContain("Bosch drill");
    expect(prompt).toContain("ASIN: B000TEST01");
    expect(prompt).toContain(
      "Niemcy: 50 PLN (https://amazon.de/dp/B000TEST01)\nPolska: 200 PLN (https://amazon.pl/dp/B000TEST01)"
    );
    expect(systemPrompt).toBe(AMAZON_DEAL_CHECK_PROMPT);
    expect(schema).toBe(AMAZON_DEAL_CHECK_SCHEMA);
    expect(imageUrl).toBe(ad.image);
  });

  it("sends no image when the ad has none", async () => {
    const { service, run, flush } = setup(answer());

    service.check(buildAd({ asin: "B000TEST02", image: "" }), prices, alert, 5);
    await flush();

    expect(run.mock.calls[0][3]).toBeUndefined();
  });
});
