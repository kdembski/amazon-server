import { describe, expect, it, vi } from "vitest";
import { AmazonDealCheckService } from "@/modules/marketplaces/amazon/services/AmazonDealCheckService";
import { AMAZON_DEAL_CHECK_PROMPT } from "@/modules/marketplaces/amazon/services/AmazonDealCheckPrompt";
import { ClaudeCliService } from "@/shared/claude/ClaudeCliService";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";
import { buildAd } from "../../../../../support/factories";
import {
  fakeBusinessLogService,
  fakeDiscordChannelService,
  fakeSystemLogService,
} from "../../../../../support/fakes";

const setup = (analysis: string | Error) => {
  const run = analysis instanceof Error ? vi.fn().mockRejectedValue(analysis) : vi.fn().mockResolvedValue(analysis);
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
  return { service, run, log, discord, logger, queue, flush: () => Promise.all(tasks) };
};

const ad = buildAd({ asin: "B000TEST01", name: "Bosch drill" });
const alert = { title: "Bosch drill" };
const prices = [
  { country: "Niemcy", value: "50", currency: "PLN", url: "https://amazon.de/dp/B000TEST01" },
  { country: "Polska", value: "200", currency: "PLN", url: "https://amazon.pl/dp/B000TEST01" },
];

describe("AmazonDealCheckService", () => {
  it.each([
    ["KUPUJ", 0x2ecc71],
    ["MOŻE", 0xf1c40f],
  ])("sends the alert with the analysis for %s", async (verdict, color) => {
    const analysis = `**Werdykt: ${verdict}**\nProdukt: Bosch drill`;
    const { service, log, discord, flush } = setup(analysis);

    service.check(ad, prices, alert, 5);
    await flush();

    expect(log.create).toHaveBeenCalledWith({
      type: "deal_check_sent",
      marketplace: "amazon",
      data: { asin: "B000TEST01", name: "Bosch drill", channel: "5", verdict },
    });
    expect(discord.send).toHaveBeenCalledWith(
      5,
      { embeds: [alert, { description: analysis, color }] },
      { asin: "B000TEST01" }
    );
  });

  it("sends nothing for NIE", async () => {
    const { service, log, discord, logger, flush } = setup("**Werdykt: NIE**\nRyzyka: brak sprzedaży");

    service.check(ad, prices, alert, 5);
    await flush();

    expect(log.create).not.toHaveBeenCalled();
    expect(discord.send).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("AmazonDealCheckService", "Deal check of B000TEST01: NIE", {
      asin: "B000TEST01",
    });
  });

  it("logs an error and sends nothing when the analysis has no verdict", async () => {
    const { service, discord, logger, flush } = setup("Nie mogę ocenić");

    service.check(ad, prices, alert, 5);
    await flush();

    expect(discord.send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("AmazonDealCheckService", "Deal check of B000TEST01 returned no verdict", {
      asin: "B000TEST01",
      analysis: "Nie mogę ocenić",
    });
  });

  it("logs an error when claude fails", async () => {
    const error = new Error("timeout");
    const { service, discord, logger, flush } = setup(error);

    service.check(ad, prices, alert, 5);
    await flush();

    expect(discord.send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("AmazonDealCheckService", "Deal check of B000TEST01 failed", {
      asin: "B000TEST01",
      error,
    });
  });

  it("truncates the analysis to 3500 characters to stay under the 6000 characters of a Discord message", async () => {
    const { service, discord, flush } = setup(`**Werdykt: KUPUJ**\n${"a".repeat(5000)}`);

    service.check(ad, prices, alert, 5);
    await flush();

    const [, { embeds }] = discord.send.mock.calls[0];
    expect(embeds[1].description).toHaveLength(3500);
  });

  it("asks about the ad with its prices in the given order and the deal check instructions", async () => {
    const { service, run, flush } = setup("**Werdykt: NIE**");

    service.check(ad, prices, alert, 5);
    await flush();

    const [prompt, systemPrompt] = run.mock.calls[0];
    expect(prompt).toContain("Bosch drill");
    expect(prompt).toContain("ASIN: B000TEST01");
    expect(prompt).toContain(
      "Niemcy: 50 PLN (https://amazon.de/dp/B000TEST01)\nPolska: 200 PLN (https://amazon.pl/dp/B000TEST01)"
    );
    expect(systemPrompt).toBe(AMAZON_DEAL_CHECK_PROMPT);
  });

  it("strips a code fence around the analysis", async () => {
    const { service, discord, flush } = setup("```\n**Werdykt: KUPUJ**\nProdukt: Bosch drill\n```");

    service.check(ad, prices, alert, 5);
    await flush();

    const [, { embeds }] = discord.send.mock.calls[0];
    expect(embeds[1].description).toBe("**Werdykt: KUPUJ**\nProdukt: Bosch drill");
  });
});
