import { describe, expect, it, vi } from "vitest";
import { createCurrencyModule } from "@/modules/currency";
import { CurrencyExchangeRateCronService } from "@/modules/currency/cron/CurrencyExchangeRateCronService";
import { ExchangeRateDailyReportSection } from "@/modules/currency/services/ExchangeRateDailyReportSection";

vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return { ...original, WebhookClient: vi.fn(function () { return {}; }) };
});

describe("createCurrencyModule", () => {
  it("mounts country, currency and rate routers, the rate cron and the report section", () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "t");
    const module = createCurrencyModule();

    expect(module.routers!.map((r) => r.path)).toEqual([
      "/countries",
      "/currencies",
      "/currencies/rates",
    ]);
    expect(module.workerCrons).toHaveLength(1);
    expect(module.workerCrons![0]).toBeInstanceOf(CurrencyExchangeRateCronService);
    expect(module.dailyReportSection).toBeInstanceOf(
      ExchangeRateDailyReportSection
    );
  });
});
