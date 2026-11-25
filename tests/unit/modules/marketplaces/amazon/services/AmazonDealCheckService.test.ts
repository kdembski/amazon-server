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
    ["KUPUJ", "🟢 KUPUJ"],
    ["MOŻE", "🟡 MOŻE"],
  ])("sends the alert with the analysis titled by the verdict %s", async (verdict, title) => {
    const { service, log, discord, flush } = setup(`**Werdykt: ${verdict}**\n**Produkt:** Bosch drill`);

    service.check(ad, prices, alert, 5);
    await flush();

    expect(log.create).toHaveBeenCalledWith({
      type: "deal_check_sent",
      marketplace: "amazon",
      data: { asin: "B000TEST01", name: "Bosch drill", channel: "5", verdict },
    });
    expect(discord.send).toHaveBeenCalledWith(
      5,
      { embeds: [alert, { title, description: "**Produkt:** Bosch drill" }] },
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

  it("keeps only the content of a code fence, dropping comments around it", async () => {
    const { service, discord, flush } = setup(
      "Oto analiza:\n```markdown\n**Werdykt: KUPUJ**\n**Produkt:** Bosch drill\n```\n\nWyniki zawierały dopisek, pominąłem go."
    );

    service.check(ad, prices, alert, 5);
    await flush();

    const [, { embeds }] = discord.send.mock.calls[0];
    expect(embeds[1].description).toBe("**Produkt:** Bosch drill");
  });

  it("takes the verdict only from the first line of the analysis", async () => {
    const { service, discord, logger, flush } = setup("Produkt: Bosch drill\nWerdykt: KUPUJ");

    service.check(ad, prices, alert, 5);
    await flush();

    expect(discord.send).not.toHaveBeenCalled();
    expect(logger.error.mock.calls[0][1]).toBe("Deal check of B000TEST01 returned no verdict");
  });
});
