import { describe, expect, it, vi } from "vitest";
import { CurrencyExchangeRateCronService } from "@/modules/currency/cron/CurrencyExchangeRateCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { PlnExchangeRateCache } from "@/modules/currency/services/PlnExchangeRateCache";
import { prisma } from "../../../../support/integration/db";
import { seedCurrency, seedPln, seedRate } from "../../../../support/integration/seed";

const byCode = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]);

const setup = () => {
  const send = vi.fn();
  const latest = vi.fn();
  const service = new CurrencyExchangeRateCronService(
    undefined,
    undefined,
    { send } as unknown as DiscordLogService,
    { latest }
  );
  return { service, send, latest };
};

describe("CurrencyExchangeRateCronService (MySQL)", () => {
  it("writes 1/rate into the existing PLN rates and refreshes the cache", async () => {
    const { service, send, latest } = setup();
    latest.mockResolvedValue({ data: { EUR: 0.25, SEK: 2.5 } });
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    const sek = await seedCurrency({ code: "SEK" });
    await seedRate({ sourceId: eur.id, targetId: pln.id, value: 1 });
    await seedRate({ sourceId: sek.id, targetId: pln.id, value: 1 });

    await service.run();

    expect(latest).toHaveBeenCalledWith({ base_currency: "PLN", currencies: "EUR,SEK" });
    const stored = await prisma.currencyExchangeRate.findMany({ include: { source: true } });
    const storedPairs: [string, number][] = stored.map((r) => [r.source.code, r.value.toNumber()]);
    expect(storedPairs.sort(byCode)).toEqual([
      ["EUR", 4],
      ["SEK", 0.4],
    ]);
    const cached = PlnExchangeRateCache.getInstance().rates ?? [];
    const cachedPairs: [string, number][] = cached.map((r) => [r.source.code, r.value.toNumber()]);
    expect(cachedPairs.sort(byCode)).toEqual([
      ["EUR", 4],
      ["SEK", 0.4],
    ]);
    expect(send).not.toHaveBeenCalled();
  });

  it("reports an API failure to the Discord log and leaves the rates alone", async () => {
    const { service, send, latest } = setup();
    latest.mockRejectedValue(new Error("boom"));
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    const rate = await seedRate({ sourceId: eur.id, targetId: pln.id, value: 4.3 });

    await service.run();

    expect(send).toHaveBeenCalledWith("Currency exchange rates error: boom");
    const row = await prisma.currencyExchangeRate.findUniqueOrThrow({ where: { id: rate.id } });
    expect(row.value.toString()).toBe("4.3");
  });
});
