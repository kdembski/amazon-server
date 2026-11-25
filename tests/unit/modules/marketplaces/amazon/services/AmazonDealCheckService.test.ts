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
  product: "Bosch GSR 12V-15, 1 szt.",
  amazon: "Niemcy **89,40 zł** · Amazon",
  allegro: "ten sam [Bosch](https://allegro.pl/oferta/1) **289 zł**",
  profit: "**163 zł** · ROI 183% · *prowizja 11%*",
  risks: ["wersja solo", "oficjalny sklep"],
  ...overrides,
});

const sentAnalysis = (discord: ReturnType<typeof fakeDiscordChannelService>) => {
  return discord.send.mock.calls[0][1].embeds[1];
};

describe("AmazonDealCheckService", () => {
  it.each([
    ["KUPUJ", "✅ **KUPUJ**"],
    ["MOŻE", "⚠️ **MOŻE**"],
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
            description,
            fields: [
              { name: "Produkt", value: "Bosch GSR 12V-15, 1 szt." },
              { name: "Amazon", value: "Niemcy **89,40 zł** · Amazon" },
              { name: "Allegro", value: "ten sam [Bosch](https://allegro.pl/oferta/1) **289 zł**" },
              { name: "Zysk", value: "**163 zł** · ROI 183% · *prowizja 11%*" },
              { name: "Ryzyka", value: "– wersja solo\n– oficjalny sklep" },
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
  ])("logs an error and sends nothing for %s", async (_, invalid) => {
    const { service, discord, logger, flush } = setup(invalid);

    service.check(ad, prices, alert, 5);
    await flush();

    expect(discord.send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("AmazonDealCheckService", "Deal check of B000TEST01 returned no verdict", {
      asin: "B000TEST01",
      answer: invalid,
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

  it("truncates a field to 700 characters and fills an empty one", async () => {
    const { service, discord, flush } = setup(answer({ product: "a".repeat(1000), amazon: "", risks: [] }));

    service.check(ad, prices, alert, 5);
    await flush();

    const { fields } = sentAnalysis(discord);
    expect(fields[0].value).toHaveLength(700);
    expect(fields[1].value).toBe("brak danych");
    expect(fields[4].value).toBe("brak danych");
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
